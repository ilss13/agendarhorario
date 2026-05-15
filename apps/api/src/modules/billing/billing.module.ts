import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Company } from '../companies/company.entity';
import { BillingEvent } from './billing-event.entity';
import { BillingPublicController, CompanyBillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Invoice } from './invoice.entity';
import { Plan } from './plan.entity';
import { StripeClient } from './stripe.client';
import { StripeWebhookController } from './stripe-webhook.controller';
import { Subscription } from './subscription.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription, Invoice, BillingEvent, Company, Appointment]),
  ],
  controllers: [BillingPublicController, CompanyBillingController, StripeWebhookController],
  providers: [BillingService, StripeClient],
  exports: [BillingService],
})
export class BillingModule {}
