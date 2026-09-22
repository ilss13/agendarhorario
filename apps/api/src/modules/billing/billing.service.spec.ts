import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SUBSCRIPTION_TRIAL_DAYS } from '@agendarhorario/contracts';
import type Stripe from 'stripe';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Company } from '../companies/company.entity';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { BillingEvent } from './billing-event.entity';
import { BillingService } from './billing.service';
import { Invoice } from './invoice.entity';
import { Plan } from './plan.entity';
import type { StripeClient } from './stripe.client';
import { Subscription } from './subscription.entity';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneOrFail: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(async (entity: unknown) => entity),
    create: jest.fn((entity: unknown) => entity),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('BillingService', () => {
  const companyId = 'company-1';
  const periodStart = new Date('2026-01-01T00:00:00.000Z');
  const periodEnd = new Date('2026-02-01T00:00:00.000Z');

  let plans: RepoMock;
  let subscriptions: RepoMock;
  let invoices: RepoMock;
  let events: RepoMock;
  let companies: RepoMock;
  let appointments: RepoMock;
  let configValues: Record<string, unknown>;
  let config: ConfigService;
  let tenant: TenantContextService;
  let stripeApi: {
    checkout: { sessions: { create: jest.Mock; retrieve: jest.Mock } };
    billingPortal: { sessions: { create: jest.Mock } };
    subscriptions: { retrieve: jest.Mock; update: jest.Mock; list: jest.Mock };
    customers: { create: jest.Mock };
  };
  let stripeClient: StripeClient;
  let service: BillingService;

  const basicoPlan: Plan = {
    id: 'plan-basico',
    code: 'basico',
    name: 'Básico',
    priceBrl: 39.9,
    monthlyAppointmentLimit: 25,
    stripePriceId: 'price_basico',
    active: true,
    sortOrder: 1,
    createdAt: periodStart,
    updatedAt: periodStart,
    deletedAt: null,
    version: 1,
  };

  const medioPlan: Plan = {
    ...basicoPlan,
    id: 'plan-medio',
    code: 'medio',
    name: 'Médio',
    priceBrl: 79.9,
    monthlyAppointmentLimit: 50,
    stripePriceId: 'price_medio',
    sortOrder: 2,
  };

  function activeSubscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
      id: 'sub-local-1',
      companyId,
      planId: basicoPlan.id,
      plan: basicoPlan,
      stripeSubscriptionId: 'sub_stripe_1',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      createdAt: periodStart,
      updatedAt: periodStart,
      deletedAt: null,
      version: 1,
      ...overrides,
    };
  }

  function company(overrides: Partial<Company> = {}): Company {
    return {
      id: companyId,
      name: 'Acme',
      slug: 'acme',
      phone: null,
      email: 'acme@example.com',
      timezone: 'America/Sao_Paulo',
      logoUrl: null,
      notificationPrefs: { email: true, secondaryChannel: 'NONE' },
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_stripe_1',
      createdAt: periodStart,
      updatedAt: periodStart,
      deletedAt: null,
      version: 1,
      ...overrides,
    };
  }

  function usageQuery(count: number): void {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(count),
    } as unknown as SelectQueryBuilder<Appointment>;
    appointments.createQueryBuilder.mockReturnValue(qb);
    appointments.count.mockResolvedValue(count);
  }

  beforeEach(() => {
    plans = createRepoMock();
    subscriptions = createRepoMock();
    invoices = createRepoMock();
    events = createRepoMock();
    companies = createRepoMock();
    appointments = createRepoMock();

    configValues = {
      'stripe.trialDays': 14,
      'stripe.prices': {
        basico: 'price_basico',
        medio: 'price_medio',
        grande: 'price_grande',
        super: 'price_super',
      },
      'stripe.successUrl': 'http://localhost:4200/dashboard/assinatura?status=ok',
      'stripe.cancelUrl': 'http://localhost:4200/dashboard/assinatura?status=cancel',
      STRIPE_CANCEL_URL: 'http://fallback/cancel',
      STRIPE_SUCCESS_URL: 'http://fallback/success',
    };

    config = {
      get: jest.fn((key: string, defaultValue?: unknown) =>
        key in configValues ? configValues[key] : defaultValue,
      ),
      getOrThrow: jest.fn((key: string) => {
        if (!(key in configValues) || configValues[key] === undefined) {
          throw new Error(`missing ${key}`);
        }
        return configValues[key];
      }),
    } as unknown as ConfigService;

    tenant = {
      requireCompanyId: jest.fn(() => companyId),
    } as unknown as TenantContextService;

    stripeApi = {
      checkout: {
        sessions: { create: jest.fn(), retrieve: jest.fn() },
      },
      billingPortal: {
        sessions: { create: jest.fn() },
      },
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
      },
      customers: { create: jest.fn() },
    };

    stripeClient = {
      get stripe() {
        return stripeApi as unknown as Stripe;
      },
    } as unknown as StripeClient;

    service = new BillingService(
      plans as unknown as Repository<Plan>,
      subscriptions as unknown as Repository<Subscription>,
      invoices as unknown as Repository<Invoice>,
      events as unknown as Repository<BillingEvent>,
      companies as unknown as Repository<Company>,
      appointments as unknown as Repository<Appointment>,
      stripeClient,
      tenant,
      config,
    );
  });

  describe('onModuleInit', () => {
    it('syncs catalog plans on startup', async () => {
      plans.findOne.mockResolvedValue(null);
      await service.onModuleInit();
      expect(plans.save).toHaveBeenCalled();
    });

    it('logs and swallows catalog sync failures', async () => {
      plans.findOne.mockRejectedValue(new Error('db'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('listPlans', () => {
    it('returns active plans mapped to DTOs', async () => {
      plans.find.mockResolvedValue([basicoPlan]);
      const result = await service.listPlans();
      expect(result).toEqual([
        expect.objectContaining({
          id: basicoPlan.id,
          code: 'basico',
          trialDays: 14,
        }),
      ]);
    });

    it('ensures catalog when no active plans exist then reloads', async () => {
      plans.find.mockResolvedValueOnce([]).mockResolvedValueOnce([basicoPlan]);
      plans.findOne.mockResolvedValue(null);
      const result = await service.listPlans();
      expect(plans.save).toHaveBeenCalled();
      expect(result[0]?.code).toBe('basico');
    });

    it('updates existing catalog rows when ensuring plans', async () => {
      plans.find.mockResolvedValueOnce([]).mockResolvedValueOnce([basicoPlan]);
      plans.findOne.mockImplementation(async ({ where }) => {
        const code = (where as { code: string }).code;
        return code === 'basico' ? { ...basicoPlan, stripePriceId: '' } : null;
      });
      await service.listPlans();
      expect(plans.save).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'basico', stripePriceId: 'price_basico' }),
      );
    });

    it('falls back to SUBSCRIPTION_TRIAL_DAYS when config trial is invalid', async () => {
      configValues['stripe.trialDays'] = -1;
      plans.find.mockResolvedValue([basicoPlan]);
      const result = await service.listPlans();
      expect(result[0]?.trialDays).toBe(SUBSCRIPTION_TRIAL_DAYS);
    });
  });

  describe('getSubscriptionSummary / canBookForCompany', () => {
    it('returns NO_SUBSCRIPTION summary when company has none', async () => {
      subscriptions.findOne.mockResolvedValue(null);
      subscriptions.count.mockResolvedValue(0);
      const summary = await service.getSubscriptionSummary();
      expect(summary).toMatchObject({
        hasSubscription: false,
        state: 'NO_SUBSCRIPTION',
        trialEligible: true,
      });
    });

    it('marks trial ineligible when company already had subscriptions', async () => {
      subscriptions.findOne.mockResolvedValue(null);
      subscriptions.count.mockResolvedValue(2);
      const summary = await service.getSubscriptionSummary();
      expect(summary.trialEligible).toBe(false);
    });

    it('returns AVAILABLE usage for active subscription under limit', async () => {
      subscriptions.findOne.mockResolvedValue(activeSubscription());
      usageQuery(3);
      const summary = await service.getSubscriptionSummary();
      expect(summary).toMatchObject({
        hasSubscription: true,
        state: 'AVAILABLE',
        trialEligible: false,
        usage: { used: 3, limit: 25 },
      });
    });

    it('exposes trialEndsAt when status is trialing', async () => {
      subscriptions.findOne.mockResolvedValue(activeSubscription({ status: 'trialing' }));
      usageQuery(0);
      const summary = await service.getSubscriptionSummary();
      expect(summary.trialEndsAt).toBe(periodEnd.toISOString());
    });

    it('returns SUSPENDED for blocking subscription statuses', async () => {
      subscriptions.findOne.mockResolvedValue(activeSubscription({ status: 'past_due' }));
      await expect(service.canBookForCompany(companyId)).resolves.toMatchObject({
        state: 'SUSPENDED',
        used: 0,
        limit: 25,
      });
    });

    it('returns OVER_LIMIT when appointments reach monthly cap', async () => {
      subscriptions.findOne.mockResolvedValue(activeSubscription());
      usageQuery(25);
      await expect(service.canBookForCompany(companyId)).resolves.toMatchObject({
        state: 'OVER_LIMIT',
        used: 25,
        limit: 25,
      });
    });

    it('returns NO_SUBSCRIPTION from canBook when missing', async () => {
      subscriptions.findOne.mockResolvedValue(null);
      await expect(service.canBookForCompany(companyId)).resolves.toEqual({
        state: 'NO_SUBSCRIPTION',
        used: 0,
        limit: 0,
        resetAt: null,
      });
    });
  });

  describe('listInvoices', () => {
    it('maps invoice rows to DTOs with nullable dates', async () => {
      const row: Invoice = {
        id: 'inv-1',
        companyId,
        subscriptionId: null,
        stripeInvoiceId: 'in_1',
        number: 'INV-1',
        amountTotal: 39.9,
        currency: 'brl',
        status: 'paid',
        dueDate: null,
        paidAt: periodStart,
        hostedInvoiceUrl: 'https://hosted',
        pdfUrl: null,
        createdAt: periodStart,
        updatedAt: periodStart,
        deletedAt: null,
        version: 1,
      };
      invoices.find.mockResolvedValue([row]);
      await expect(service.listInvoices()).resolves.toEqual([
        expect.objectContaining({
          id: 'inv-1',
          amountTotal: 39.9,
          dueDate: null,
          paidAt: periodStart.toISOString(),
          pdfUrl: null,
        }),
      ]);
    });
  });

  describe('createCheckoutSession', () => {
    it('creates checkout with trial when eligible', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.count.mockResolvedValue(0);
      stripeApi.checkout.sessions.create.mockResolvedValue({ url: 'https://pay' });
      await expect(service.createCheckoutSession('basico')).resolves.toEqual({
        url: 'https://pay',
      });
      expect(stripeApi.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({ trial_period_days: 14 }),
        }),
      );
    });

    it('creates Stripe customer when company has none', async () => {
      const c = company({ stripeCustomerId: null });
      companies.findOneOrFail.mockResolvedValue(c);
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.count.mockResolvedValue(1);
      stripeApi.customers.create.mockResolvedValue({ id: 'cus_new' });
      stripeApi.checkout.sessions.create.mockResolvedValue({ url: 'https://pay' });
      await service.createCheckoutSession('basico');
      expect(stripeApi.customers.create).toHaveBeenCalled();
      expect(companies.save).toHaveBeenCalledWith(
        expect.objectContaining({ stripeCustomerId: 'cus_new' }),
      );
      expect(stripeApi.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.not.objectContaining({ trial_period_days: expect.anything() }),
        }),
      );
    });

    it('throws BadRequestException when plan has no Stripe price', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      plans.findOne.mockResolvedValue({ ...basicoPlan, stripePriceId: '' });
      await expect(service.createCheckoutSession('basico')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when plan code is unknown', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      plans.findOne.mockResolvedValue(null);
      await expect(service.createCheckoutSession('basico')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when Stripe omits checkout URL', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.count.mockResolvedValue(1);
      stripeApi.checkout.sessions.create.mockResolvedValue({ url: null });
      await expect(service.createCheckoutSession('basico')).rejects.toThrow(BadRequestException);
    });

    it('appends session_id placeholder when success URL lacks it', async () => {
      configValues['stripe.successUrl'] = 'http://localhost:4200/ok';
      companies.findOneOrFail.mockResolvedValue(company());
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.count.mockResolvedValue(1);
      stripeApi.checkout.sessions.create.mockResolvedValue({ url: 'https://pay' });
      await service.createCheckoutSession('basico');
      expect(stripeApi.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'http://localhost:4200/ok?session_id={CHECKOUT_SESSION_ID}',
        }),
      );
    });

    it('keeps success URL that already contains CHECKOUT_SESSION_ID', async () => {
      configValues['stripe.successUrl'] =
        'http://localhost:4200/ok?session_id={CHECKOUT_SESSION_ID}';
      companies.findOneOrFail.mockResolvedValue(company());
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.count.mockResolvedValue(1);
      stripeApi.checkout.sessions.create.mockResolvedValue({ url: 'https://pay' });
      await service.createCheckoutSession('basico');
      expect(stripeApi.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'http://localhost:4200/ok?session_id={CHECKOUT_SESSION_ID}',
        }),
      );
    });
  });

  describe('confirmCheckout', () => {
    it('rejects session belonging to another company via metadata', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      stripeApi.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_1',
        metadata: { companyId: 'other' },
        subscription: null,
        customer: 'cus_1',
      });
      await expect(service.confirmCheckout('cs_1')).rejects.toThrow(BadRequestException);
    });

    it('rejects session with mismatched Stripe customer', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      stripeApi.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_1',
        metadata: { companyId },
        subscription: { metadata: {} },
        customer: 'cus_other',
      });
      await expect(service.confirmCheckout('cs_1')).rejects.toThrow(BadRequestException);
    });

    it('upserts from checkout session when sessionId is provided', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      subscriptions.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(activeSubscription());
      usageQuery(0);
      stripeApi.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_1',
        mode: 'subscription',
        metadata: { companyId, planCode: 'basico' },
        customer: 'cus_1',
        subscription: {
          id: 'sub_stripe_1',
          status: 'active',
          cancel_at_period_end: false,
          canceled_at: null,
          customer: 'cus_1',
          start_date: Math.floor(periodStart.getTime() / 1000),
          metadata: { companyId, planCode: 'basico' },
          items: {
            data: [
              {
                id: 'si_1',
                price: { id: 'price_basico' },
                current_period_start: Math.floor(periodStart.getTime() / 1000),
                current_period_end: Math.floor(periodEnd.getTime() / 1000),
              },
            ],
          },
        },
      });
      plans.findOne.mockResolvedValue(basicoPlan);
      const summary = await service.confirmCheckout('cs_1');
      expect(summary.hasSubscription).toBe(true);
      expect(subscriptions.save).toHaveBeenCalled();
    });

    it('syncs customer subscriptions when sessionId is omitted', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      stripeApi.subscriptions.list.mockResolvedValue({ data: [] });
      subscriptions.findOne.mockResolvedValue(null);
      subscriptions.count.mockResolvedValue(0);
      const summary = await service.confirmCheckout();
      expect(stripeApi.subscriptions.list).toHaveBeenCalledWith({
        customer: 'cus_1',
        status: 'all',
        limit: 10,
      });
      expect(summary.hasSubscription).toBe(false);
    });

    it('warns and continues when neither sessionId nor customer exists', async () => {
      companies.findOneOrFail.mockResolvedValue(company({ stripeCustomerId: null }));
      subscriptions.findOne.mockResolvedValue(null);
      subscriptions.count.mockResolvedValue(0);
      await expect(service.confirmCheckout()).resolves.toMatchObject({ hasSubscription: false });
    });
  });

  describe('upsertFromCheckoutSession', () => {
    it('ignores non-subscription checkout modes', async () => {
      await service.upsertFromCheckoutSession({
        id: 'cs_1',
        mode: 'payment',
      } as Stripe.Checkout.Session);
      expect(stripeApi.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    it('returns early when session has no subscription', async () => {
      await service.upsertFromCheckoutSession({
        id: 'cs_1',
        mode: 'subscription',
        subscription: null,
      } as Stripe.Checkout.Session);
      expect(subscriptions.save).not.toHaveBeenCalled();
    });

    it('retrieves subscription by id string and merges session metadata', async () => {
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.findOne.mockResolvedValue(null);
      stripeApi.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_stripe_1',
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        customer: { id: 'cus_1' },
        start_date: Math.floor(periodStart.getTime() / 1000),
        metadata: {},
        items: { data: [{ price: { id: 'price_basico' } }] },
      });
      await service.upsertFromCheckoutSession({
        id: 'cs_1',
        mode: 'subscription',
        metadata: { companyId, planCode: 'basico' },
        subscription: 'sub_stripe_1',
      } as unknown as Stripe.Checkout.Session);
      expect(subscriptions.save).toHaveBeenCalled();
      expect(companies.update).toHaveBeenCalledWith(
        { id: companyId },
        expect.objectContaining({
          stripeCustomerId: 'cus_1',
          stripeSubscriptionId: 'sub_stripe_1',
        }),
      );
    });
  });

  describe('createPortalSession', () => {
    it('throws BadRequestException when Stripe customer is missing', async () => {
      companies.findOneOrFail.mockResolvedValue(company({ stripeCustomerId: null }));
      await expect(service.createPortalSession()).rejects.toThrow(BadRequestException);
    });

    it('returns portal URL on success', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      stripeApi.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal' });
      await expect(service.createPortalSession()).resolves.toEqual({ url: 'https://portal' });
    });
  });

  describe('changePlan', () => {
    it('throws when there is no active subscription', async () => {
      subscriptions.findOne.mockResolvedValue(null);
      await expect(service.changePlan('medio')).rejects.toThrow(BadRequestException);
    });

    it('throws when target plan has no Stripe price', async () => {
      subscriptions.findOne.mockResolvedValue(activeSubscription());
      plans.findOne.mockResolvedValue({ ...medioPlan, stripePriceId: '' });
      await expect(service.changePlan('medio')).rejects.toThrow(BadRequestException);
    });

    it('throws when Stripe subscription has no items', async () => {
      subscriptions.findOne
        .mockResolvedValueOnce(activeSubscription())
        .mockResolvedValueOnce(activeSubscription());
      plans.findOne.mockResolvedValue(medioPlan);
      stripeApi.subscriptions.retrieve.mockResolvedValue({ items: { data: [] } });
      usageQuery(0);
      await expect(service.changePlan('medio')).rejects.toThrow(BadRequestException);
    });

    it('upgrades with proration', async () => {
      subscriptions.findOne
        .mockResolvedValueOnce(activeSubscription())
        .mockResolvedValueOnce(activeSubscription({ plan: medioPlan, planId: medioPlan.id }));
      plans.findOne.mockResolvedValue(medioPlan);
      stripeApi.subscriptions.retrieve.mockResolvedValue({
        items: { data: [{ id: 'si_1' }] },
      });
      stripeApi.subscriptions.update.mockResolvedValue({});
      usageQuery(0);
      await service.changePlan('medio');
      expect(stripeApi.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_1',
        expect.objectContaining({ proration_behavior: 'create_prorations' }),
      );
    });

    it('downgrades without proration and keeps billing cycle', async () => {
      subscriptions.findOne
        .mockResolvedValueOnce(activeSubscription({ plan: medioPlan, planId: medioPlan.id }))
        .mockResolvedValueOnce(activeSubscription());
      plans.findOne.mockResolvedValue(basicoPlan);
      stripeApi.subscriptions.retrieve.mockResolvedValue({
        items: { data: [{ id: 'si_1' }] },
      });
      stripeApi.subscriptions.update.mockResolvedValue({});
      usageQuery(0);
      await service.changePlan('basico');
      expect(stripeApi.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_1',
        expect.objectContaining({
          proration_behavior: 'none',
          billing_cycle_anchor: 'unchanged',
          cancel_at_period_end: false,
        }),
      );
    });
  });

  describe('cancel', () => {
    it('throws BadRequestException without active subscription', async () => {
      subscriptions.findOne.mockResolvedValue(null);
      await expect(service.cancel()).rejects.toThrow(BadRequestException);
    });

    it('sets cancel_at_period_end on Stripe and returns summary', async () => {
      subscriptions.findOne
        .mockResolvedValueOnce(activeSubscription())
        .mockResolvedValueOnce(activeSubscription({ cancelAtPeriodEnd: true }));
      stripeApi.subscriptions.update.mockResolvedValue({});
      usageQuery(0);
      const summary = await service.cancel();
      expect(stripeApi.subscriptions.update).toHaveBeenCalledWith('sub_stripe_1', {
        cancel_at_period_end: true,
      });
      expect(summary.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('tryRegisterEvent / markEventProcessed', () => {
    it('returns true for a newly registered event', async () => {
      events.create.mockImplementation((e) => e as BillingEvent);
      events.save.mockResolvedValue({} as BillingEvent);
      await expect(
        service.tryRegisterEvent({ id: 'evt_1', type: 'invoice.paid' } as Stripe.Event),
      ).resolves.toBe(true);
    });

    it('returns true for duplicate event that is still unprocessed', async () => {
      events.save.mockRejectedValue(new Error('duplicate'));
      events.findOne.mockResolvedValue({
        eventId: 'evt_1',
        processedAt: null,
      } as BillingEvent);
      await expect(
        service.tryRegisterEvent({ id: 'evt_1', type: 'invoice.paid' } as Stripe.Event),
      ).resolves.toBe(true);
    });

    it('returns false for already processed duplicate event', async () => {
      events.save.mockRejectedValue(new Error('duplicate'));
      events.findOne.mockResolvedValue({
        eventId: 'evt_1',
        processedAt: new Date(),
      } as BillingEvent);
      await expect(
        service.tryRegisterEvent({ id: 'evt_1', type: 'invoice.paid' } as Stripe.Event),
      ).resolves.toBe(false);
    });

    it('marks event processed with optional error message', async () => {
      events.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      await service.markEventProcessed('evt_1', 'boom');
      expect(events.update).toHaveBeenCalledWith(
        { eventId: 'evt_1' },
        expect.objectContaining({ errorMessage: 'boom' }),
      );
    });
  });

  describe('upsertSubscriptionFromStripe', () => {
    function stripeSub(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
      return {
        id: 'sub_stripe_1',
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        customer: 'cus_1',
        start_date: Math.floor(periodStart.getTime() / 1000),
        metadata: { companyId, planCode: 'basico' },
        items: {
          data: [
            {
              id: 'si_1',
              price: { id: 'price_basico' },
              current_period_start: Math.floor(periodStart.getTime() / 1000),
              current_period_end: Math.floor(periodEnd.getTime() / 1000),
            },
          ],
        },
        ...overrides,
      } as Stripe.Subscription;
    }

    it('no-ops when companyId metadata is missing', async () => {
      await service.upsertSubscriptionFromStripe(stripeSub({ metadata: {} }));
      expect(subscriptions.save).not.toHaveBeenCalled();
    });

    it('no-ops when plan cannot be resolved', async () => {
      plans.findOne.mockResolvedValue(null);
      await service.upsertSubscriptionFromStripe(stripeSub());
      expect(subscriptions.save).not.toHaveBeenCalled();
    });

    it('resolves plan by price id when planCode is absent', async () => {
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.findOne.mockResolvedValue(null);
      await service.upsertSubscriptionFromStripe(stripeSub({ metadata: { companyId } }));
      expect(plans.findOne).toHaveBeenCalledWith({
        where: { stripePriceId: 'price_basico' },
      });
      expect(subscriptions.save).toHaveBeenCalled();
    });

    it('updates existing local subscription', async () => {
      plans.findOne.mockResolvedValue(basicoPlan);
      const existing = activeSubscription();
      subscriptions.findOne.mockResolvedValue(existing);
      await service.upsertSubscriptionFromStripe(stripeSub({ status: 'trialing' }));
      expect(subscriptions.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'trialing' }),
      );
    });

    it('clears company stripeSubscriptionId when canceled', async () => {
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.findOne.mockResolvedValue(null);
      await service.upsertSubscriptionFromStripe(
        stripeSub({
          status: 'canceled',
          canceled_at: Math.floor(periodEnd.getTime() / 1000),
        }),
      );
      expect(companies.update).toHaveBeenCalledWith(
        { id: companyId },
        expect.objectContaining({ stripeSubscriptionId: null }),
      );
    });

    it('injects companyId into listed subscriptions during customer sync', async () => {
      companies.findOneOrFail.mockResolvedValue(company());
      plans.findOne.mockResolvedValue(basicoPlan);
      subscriptions.findOne.mockResolvedValue(null);
      subscriptions.count.mockResolvedValue(0);
      stripeApi.subscriptions.list.mockResolvedValue({
        data: [stripeSub({ metadata: {} })],
      });
      await service.confirmCheckout();
      expect(subscriptions.save).toHaveBeenCalled();
    });
  });

  describe('upsertInvoiceFromStripe', () => {
    function stripeInvoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
      return {
        id: 'in_1',
        customer: 'cus_1',
        number: '1',
        amount_due: 3990,
        currency: 'brl',
        status: 'open',
        due_date: null,
        hosted_invoice_url: null,
        invoice_pdf: null,
        status_transitions: {},
        ...overrides,
      } as unknown as Stripe.Invoice;
    }

    it('returns early when invoice has no customer', async () => {
      await service.upsertInvoiceFromStripe(stripeInvoice({ customer: null }));
      expect(companies.findOne).not.toHaveBeenCalled();
    });

    it('returns early when company is not found for customer', async () => {
      companies.findOne.mockResolvedValue(null);
      await service.upsertInvoiceFromStripe(stripeInvoice());
      expect(invoices.save).not.toHaveBeenCalled();
    });

    it('creates invoice linked via string subscription id', async () => {
      companies.findOne.mockResolvedValue(company());
      subscriptions.findOne.mockResolvedValue(activeSubscription());
      invoices.findOne.mockResolvedValue(null);
      await service.upsertInvoiceFromStripe(stripeInvoice({ subscription: 'sub_stripe_1' }));
      expect(invoices.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeInvoiceId: 'in_1',
          amountTotal: 39.9,
          subscriptionId: 'sub-local-1',
        }),
      );
    });

    it('resolves nested parent subscription object id', async () => {
      companies.findOne.mockResolvedValue(company());
      subscriptions.findOne.mockResolvedValue(activeSubscription());
      invoices.findOne.mockResolvedValue(null);
      await service.upsertInvoiceFromStripe(
        stripeInvoice({
          parent: { subscription_details: { subscription: { id: 'sub_stripe_1' } } },
        }),
      );
      expect(subscriptions.findOne).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_1' },
      });
    });

    it('updates existing invoice and sets paidAt when paid', async () => {
      companies.findOne.mockResolvedValue(company());
      subscriptions.findOne.mockResolvedValue(null);
      const existing = {
        id: 'inv-1',
        companyId,
        subscriptionId: null,
        stripeInvoiceId: 'in_1',
        number: null,
        amountTotal: 0,
        currency: 'brl',
        status: 'open' as const,
        dueDate: null,
        paidAt: null,
        hostedInvoiceUrl: null,
        pdfUrl: null,
        createdAt: periodStart,
        updatedAt: periodStart,
        deletedAt: null,
        version: 1,
      };
      invoices.findOne.mockResolvedValue(existing);
      const paidAtUnix = Math.floor(periodStart.getTime() / 1000);
      await service.upsertInvoiceFromStripe(
        stripeInvoice({
          status: 'paid',
          due_date: paidAtUnix,
          status_transitions: { paid_at: paidAtUnix },
          customer: { id: 'cus_1' },
        }),
      );
      expect(invoices.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          paidAt: periodStart,
        }),
      );
    });
  });
});
