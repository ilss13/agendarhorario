import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import type Stripe from 'stripe';
import type {
  InvoiceDto,
  PlanCode,
  PlanDto,
  SubscriptionSummaryDto,
  UsageState,
} from '@agendarhorario/contracts';
import { Appointment } from '../appointments/appointment.entity';
import { Company } from '../companies/company.entity';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { BillingEvent } from './billing-event.entity';
import { Invoice } from './invoice.entity';
import { Plan } from './plan.entity';
import { StripeClient } from './stripe.client';
import { Subscription, SubscriptionStatus } from './subscription.entity';

export interface CanBookResult {
  state: UsageState;
  used: number;
  limit: number;
  resetAt: Date | null;
}

const BLOCKING_STATUSES: SubscriptionStatus[] = [
  'incomplete_expired',
  'past_due',
  'canceled',
  'unpaid',
];

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(BillingEvent) private readonly events: Repository<BillingEvent>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    private readonly stripeClient: StripeClient,
    private readonly tenant: TenantContextService,
    private readonly config: ConfigService,
  ) {}

  async listPlans(): Promise<PlanDto[]> {
    const rows = await this.plans.find({
      where: { active: true },
      order: { sortOrder: 'ASC' },
    });
    return rows.map(toPlanDto);
  }

  async getSubscriptionSummary(): Promise<SubscriptionSummaryDto> {
    const companyId = this.tenant.requireCompanyId();
    const subscription = await this.findActiveSubscription(companyId);
    if (!subscription) {
      return {
        hasSubscription: false,
        plan: null,
        status: null,
        state: 'NO_SUBSCRIPTION',
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        usage: { used: 0, limit: 0, resetAt: null },
      };
    }
    const plan = subscription.plan!;
    const usage = await this.computeUsage(companyId, subscription);
    return {
      hasSubscription: true,
      plan: toPlanDto(plan),
      status: subscription.status,
      state: usage.state,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      usage: {
        used: usage.used,
        limit: usage.limit,
        resetAt: usage.resetAt?.toISOString() ?? null,
      },
    };
  }

  async canBookForCompany(companyId: string): Promise<CanBookResult> {
    const subscription = await this.findActiveSubscription(companyId);
    if (!subscription) {
      return { state: 'NO_SUBSCRIPTION', used: 0, limit: 0, resetAt: null };
    }
    return this.computeUsage(companyId, subscription);
  }

  async listInvoices(): Promise<InvoiceDto[]> {
    const companyId = this.tenant.requireCompanyId();
    const rows = await this.invoices.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((i) => ({
      id: i.id,
      stripeInvoiceId: i.stripeInvoiceId,
      number: i.number,
      amountTotal: Number(i.amountTotal),
      currency: i.currency,
      status: i.status,
      dueDate: i.dueDate?.toISOString() ?? null,
      paidAt: i.paidAt?.toISOString() ?? null,
      hostedInvoiceUrl: i.hostedInvoiceUrl,
      pdfUrl: i.pdfUrl,
      createdAt: i.createdAt.toISOString(),
    }));
  }

  async createCheckoutSession(planCode: PlanCode): Promise<{ url: string }> {
    const companyId = this.tenant.requireCompanyId();
    const company = await this.companies.findOneOrFail({ where: { id: companyId } });
    const plan = await this.requirePlan(planCode);
    const stripe = this.stripeClient.stripe;

    const customerId = await this.ensureStripeCustomer(company);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: this.config.getOrThrow<string>('STRIPE_SUCCESS_URL'),
      cancel_url: this.config.getOrThrow<string>('STRIPE_CANCEL_URL'),
      metadata: { companyId, planCode },
      subscription_data: { metadata: { companyId, planCode } },
    });
    if (!session.url) throw new BadRequestException('Stripe não retornou URL');
    return { url: session.url };
  }

  async createPortalSession(): Promise<{ url: string }> {
    const companyId = this.tenant.requireCompanyId();
    const company = await this.companies.findOneOrFail({ where: { id: companyId } });
    if (!company.stripeCustomerId) {
      throw new BadRequestException('Cliente Stripe ainda não criado — assine um plano primeiro');
    }
    const session = await this.stripeClient.stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: this.config.getOrThrow<string>('STRIPE_SUCCESS_URL'),
    });
    return { url: session.url };
  }

  async changePlan(planCode: PlanCode): Promise<SubscriptionSummaryDto> {
    const companyId = this.tenant.requireCompanyId();
    const subscription = await this.findActiveSubscription(companyId);
    if (!subscription) {
      throw new BadRequestException('Sem assinatura ativa — use o checkout para começar');
    }
    const plan = await this.requirePlan(planCode);
    const stripe = this.stripeClient.stripe;
    const sub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const item = sub.items.data[0];
    if (!item) throw new BadRequestException('Assinatura sem item no Stripe');

    const isUpgrade = plan.priceBrl > subscription.plan!.priceBrl;
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{ id: item.id, price: plan.stripePriceId }],
      proration_behavior: isUpgrade ? 'create_prorations' : 'none',
      ...(isUpgrade
        ? {}
        : { billing_cycle_anchor: 'unchanged' as const, cancel_at_period_end: false }),
      metadata: { companyId, planCode },
    });

    // Webhook fará upsert; refresh local oportunista
    return this.getSubscriptionSummary();
  }

  async cancel(): Promise<SubscriptionSummaryDto> {
    const companyId = this.tenant.requireCompanyId();
    const subscription = await this.findActiveSubscription(companyId);
    if (!subscription) throw new BadRequestException('Sem assinatura ativa');
    await this.stripeClient.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return this.getSubscriptionSummary();
  }

  /** Persiste o evento de forma idempotente; retorna true se ainda não estava processado. */
  async tryRegisterEvent(event: Stripe.Event): Promise<boolean> {
    try {
      await this.events.save(
        this.events.create({
          provider: 'stripe',
          eventId: event.id,
          type: event.type,
          payload: event as unknown as Record<string, unknown>,
          receivedAt: new Date(),
          processedAt: null,
        }),
      );
      return true;
    } catch {
      // já existe (unique constraint)
      const existing = await this.events.findOne({ where: { eventId: event.id } });
      return existing?.processedAt === null;
    }
  }

  async markEventProcessed(eventId: string, error?: string): Promise<void> {
    await this.events.update({ eventId }, { processedAt: new Date(), errorMessage: error ?? null });
  }

  async upsertSubscriptionFromStripe(stripeSub: Stripe.Subscription): Promise<void> {
    const companyId = stripeSub.metadata?.['companyId'] ?? null;
    const planCode = stripeSub.metadata?.['planCode'] ?? null;
    if (!companyId) {
      this.logger.warn(`subscription ${stripeSub.id} sem companyId em metadata`);
      return;
    }
    const plan = planCode
      ? await this.plans.findOne({ where: { code: planCode as PlanCode } })
      : await this.plans.findOne({
          where: { stripePriceId: stripeSub.items.data[0]?.price?.id ?? '' },
        });
    if (!plan) {
      this.logger.warn(`subscription ${stripeSub.id} sem plano correspondente`);
      return;
    }

    const existing = await this.subscriptions.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    const data = {
      companyId,
      planId: plan.id,
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status as SubscriptionStatus,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
    };
    if (existing) {
      Object.assign(existing, data);
      await this.subscriptions.save(existing);
    } else {
      await this.subscriptions.save(this.subscriptions.create(data));
    }
    await this.companies.update(
      { id: companyId },
      {
        stripeCustomerId:
          typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id,
        stripeSubscriptionId:
          stripeSub.status === 'canceled' || stripeSub.status === 'incomplete_expired'
            ? null
            : stripeSub.id,
      },
    );
  }

  async upsertInvoiceFromStripe(stripeInvoice: Stripe.Invoice): Promise<void> {
    const customerId =
      typeof stripeInvoice.customer === 'string'
        ? stripeInvoice.customer
        : stripeInvoice.customer?.id;
    if (!customerId) return;
    const company = await this.companies.findOne({ where: { stripeCustomerId: customerId } });
    if (!company) {
      this.logger.warn(`invoice ${stripeInvoice.id} sem company correspondente`);
      return;
    }
    const subscription = stripeInvoice.subscription
      ? await this.subscriptions.findOne({
          where: {
            stripeSubscriptionId:
              typeof stripeInvoice.subscription === 'string'
                ? stripeInvoice.subscription
                : stripeInvoice.subscription.id,
          },
        })
      : null;
    const existing = await this.invoices.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });
    const data = {
      companyId: company.id,
      subscriptionId: subscription?.id ?? null,
      stripeInvoiceId: stripeInvoice.id,
      number: stripeInvoice.number ?? null,
      amountTotal: stripeInvoice.amount_due / 100,
      currency: stripeInvoice.currency,
      status: (stripeInvoice.status ?? 'open') as InvoiceDto['status'],
      dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
      paidAt:
        stripeInvoice.status === 'paid' && stripeInvoice.status_transitions?.paid_at
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
          : null,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? null,
      pdfUrl: stripeInvoice.invoice_pdf ?? null,
    };
    if (existing) {
      Object.assign(existing, data);
      await this.invoices.save(existing);
    } else {
      await this.invoices.save(this.invoices.create(data));
    }
  }

  private async ensureStripeCustomer(company: Company): Promise<string> {
    if (company.stripeCustomerId) return company.stripeCustomerId;
    const customer = await this.stripeClient.stripe.customers.create({
      name: company.name,
      email: company.email ?? undefined,
      metadata: { companyId: company.id },
    });
    company.stripeCustomerId = customer.id;
    await this.companies.save(company);
    return customer.id;
  }

  private async findActiveSubscription(companyId: string): Promise<Subscription | null> {
    return this.subscriptions.findOne({
      where: { companyId, deletedAt: IsNull() },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async requirePlan(code: PlanCode): Promise<Plan> {
    const plan = await this.plans.findOne({ where: { code, active: true } });
    if (!plan) throw new NotFoundException(`Plano ${code} não encontrado`);
    return plan;
  }

  private async computeUsage(
    companyId: string,
    subscription: Subscription,
  ): Promise<CanBookResult> {
    if (BLOCKING_STATUSES.includes(subscription.status)) {
      return {
        state: 'SUSPENDED',
        used: 0,
        limit: subscription.plan?.monthlyAppointmentLimit ?? 0,
        resetAt: subscription.currentPeriodEnd,
      };
    }
    const used = await this.appointments.count({
      where: {
        companyId,
        status: Not(In(['CANCELLED'] as const)),
        deletedAt: IsNull(),
        createdAt: Not(IsNull()),
      } as unknown as Record<string, unknown>,
    });
    // Recalcula filtrando por currentPeriod
    const usedInPeriod = await this.appointments
      .createQueryBuilder('a')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('a.status <> :cancelled', { cancelled: 'CANCELLED' })
      .andWhere('a.deletedAt IS NULL')
      .andWhere('a.createdAt >= :start', { start: subscription.currentPeriodStart })
      .andWhere('a.createdAt < :end', { end: subscription.currentPeriodEnd })
      .getCount();
    const limit = subscription.plan!.monthlyAppointmentLimit;
    if (usedInPeriod >= limit) {
      return {
        state: 'OVER_LIMIT',
        used: usedInPeriod,
        limit,
        resetAt: subscription.currentPeriodEnd,
      };
    }
    return {
      state: 'AVAILABLE',
      used: usedInPeriod,
      limit,
      resetAt: subscription.currentPeriodEnd,
    };
  }
}

const toPlanDto = (plan: Plan): PlanDto => ({
  id: plan.id,
  code: plan.code,
  name: plan.name,
  priceBrl: Number(plan.priceBrl),
  monthlyAppointmentLimit: plan.monthlyAppointmentLimit,
  stripePriceId: plan.stripePriceId,
  sortOrder: plan.sortOrder,
});
