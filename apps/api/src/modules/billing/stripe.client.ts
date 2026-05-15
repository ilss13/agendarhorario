import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClient {
  private readonly logger = new Logger(StripeClient.name);
  private readonly client: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.client = key
      ? new Stripe(key, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion })
      : null;
    if (!this.client) {
      this.logger.warn('Stripe não configurado — endpoints de billing retornarão erro.');
    }
  }

  get stripe(): Stripe {
    if (!this.client) {
      throw new Error('Stripe não configurado (STRIPE_SECRET_KEY ausente)');
    }
    return this.client;
  }

  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
