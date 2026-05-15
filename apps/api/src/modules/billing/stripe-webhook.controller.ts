import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import type Stripe from 'stripe';
import { Public } from '../auth/auth.guard';
import { BillingService } from './billing.service';
import { StripeClient } from './stripe.client';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeClient,
    private readonly billing: BillingService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!signature) throw new BadRequestException('stripe-signature ausente');
    const raw = req.rawBody;
    if (!raw) throw new BadRequestException('Raw body indisponível');

    let event: Stripe.Event;
    try {
      event = this.stripe.constructEvent(raw, signature);
    } catch (err) {
      this.logger.warn(`webhook inválido: ${(err as Error).message}`);
      throw new BadRequestException('Assinatura inválida');
    }

    const shouldProcess = await this.billing.tryRegisterEvent(event);
    if (!shouldProcess) {
      this.logger.debug(`evento ${event.id} já processado, ignorando`);
      return { received: true };
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.billing.upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.created':
        case 'invoice.finalized':
        case 'invoice.paid':
        case 'invoice.payment_failed':
        case 'invoice.voided':
        case 'invoice.marked_uncollectible':
          await this.billing.upsertInvoiceFromStripe(event.data.object as Stripe.Invoice);
          break;
        default:
          this.logger.debug(`evento ignorado: ${event.type}`);
      }
      await this.billing.markEventProcessed(event.id);
    } catch (err) {
      this.logger.error(`falha processando ${event.type}: ${(err as Error).message}`);
      await this.billing.markEventProcessed(event.id, (err as Error).message);
      throw err;
    }

    return { received: true };
  }
}
