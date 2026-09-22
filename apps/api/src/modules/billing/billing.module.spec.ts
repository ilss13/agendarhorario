import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPublicController, CompanyBillingController } from './billing.controller';
import { BillingModule } from './billing.module';
import { BillingService } from './billing.service';
import { StripeClient } from './stripe.client';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('BillingModule', () => {
  it('registers the three billing controllers', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BillingModule) as
      | unknown[]
      | undefined;
    expect(controllers).toEqual([
      BillingPublicController,
      CompanyBillingController,
      StripeWebhookController,
    ]);
  });

  it('provides BillingService and StripeClient', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, BillingModule) as
      | unknown[]
      | undefined;
    expect(providers).toEqual([BillingService, StripeClient]);
  });

  it('exports BillingService for other modules', () => {
    const exportsMeta = Reflect.getMetadata(MODULE_METADATA.EXPORTS, BillingModule) as
      | unknown[]
      | undefined;
    expect(exportsMeta).toEqual([BillingService]);
  });

  it('imports TypeOrm feature entities for billing', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, BillingModule) as
      | Array<{ module?: unknown; providers?: Array<{ provide?: string }> }>
      | undefined;
    expect(imports).toHaveLength(1);
    expect(imports?.[0]?.module).toBe(TypeOrmModule);
    const provides = (imports?.[0]?.providers ?? []).map((p) => p.provide);
    expect(provides).toEqual(
      expect.arrayContaining([
        'PlanRepository',
        'SubscriptionRepository',
        'InvoiceRepository',
        'BillingEventRepository',
        'CompanyRepository',
        'AppointmentRepository',
      ]),
    );
  });
});
