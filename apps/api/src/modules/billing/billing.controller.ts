import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ChangePlanRequest,
  CheckoutSessionRequest,
  InvoiceDto,
  PlanDto,
  SubscriptionSummaryDto,
  changePlanRequestSchema,
  checkoutSessionRequestSchema,
} from '@agendarhorario/contracts';
import { Public } from '../auth/auth.guard';
import { CompanyScoped } from '../../shared/auth/company-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingPublicController {
  constructor(private readonly billing: BillingService) {}

  @Public()
  @Get('plans')
  listPlans(): Promise<PlanDto[]> {
    return this.billing.listPlans();
  }
}

@CompanyScoped()
@Controller('company/billing')
export class CompanyBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  subscription(): Promise<SubscriptionSummaryDto> {
    return this.billing.getSubscriptionSummary();
  }

  @Get('invoices')
  invoices(): Promise<InvoiceDto[]> {
    return this.billing.listInvoices();
  }

  @Post('checkout-session')
  @HttpCode(HttpStatus.OK)
  checkout(
    @Body(new ZodValidationPipe(checkoutSessionRequestSchema)) input: CheckoutSessionRequest,
  ): Promise<{ url: string }> {
    return this.billing.createCheckoutSession(input.planCode);
  }

  @Post('portal-session')
  @HttpCode(HttpStatus.OK)
  portal(): Promise<{ url: string }> {
    return this.billing.createPortalSession();
  }

  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  changePlan(
    @Body(new ZodValidationPipe(changePlanRequestSchema)) input: ChangePlanRequest,
  ): Promise<SubscriptionSummaryDto> {
    return this.billing.changePlan(input.planCode);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(): Promise<SubscriptionSummaryDto> {
    return this.billing.cancel();
  }
}
