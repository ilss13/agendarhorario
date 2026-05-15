import { z } from 'zod';
import { uuidSchema } from './common';

export const planCodeSchema = z.enum(['basico', 'medio', 'grande', 'super']);
export type PlanCode = z.infer<typeof planCodeSchema>;

export const planSchema = z.object({
  id: uuidSchema,
  code: planCodeSchema,
  name: z.string(),
  priceBrl: z.number(),
  monthlyAppointmentLimit: z.number().int(),
  stripePriceId: z.string(),
  sortOrder: z.number().int(),
});
export type PlanDto = z.infer<typeof planSchema>;

export const subscriptionStatusSchema = z.enum([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);
export type SubscriptionStatusValue = z.infer<typeof subscriptionStatusSchema>;

export const usageStateSchema = z.enum(['NO_SUBSCRIPTION', 'AVAILABLE', 'OVER_LIMIT', 'SUSPENDED']);
export type UsageState = z.infer<typeof usageStateSchema>;

export const subscriptionSummarySchema = z.object({
  hasSubscription: z.boolean(),
  plan: planSchema.nullable(),
  status: subscriptionStatusSchema.nullable(),
  state: usageStateSchema,
  cancelAtPeriodEnd: z.boolean(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  usage: z.object({
    used: z.number().int(),
    limit: z.number().int(),
    resetAt: z.string().nullable(),
  }),
});
export type SubscriptionSummaryDto = z.infer<typeof subscriptionSummarySchema>;

export const invoiceSchema = z.object({
  id: uuidSchema,
  stripeInvoiceId: z.string(),
  number: z.string().nullable(),
  amountTotal: z.number(),
  currency: z.string(),
  status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']),
  dueDate: z.string().nullable(),
  paidAt: z.string().nullable(),
  hostedInvoiceUrl: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type InvoiceDto = z.infer<typeof invoiceSchema>;

export const checkoutSessionRequestSchema = z.object({
  planCode: planCodeSchema,
});
export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;

export const checkoutSessionResponseSchema = z.object({
  url: z.string().url(),
});
export type CheckoutSessionResponse = z.infer<typeof checkoutSessionResponseSchema>;

export const portalSessionResponseSchema = z.object({
  url: z.string().url(),
});

export const changePlanRequestSchema = z.object({
  planCode: planCodeSchema,
});
export type ChangePlanRequest = z.infer<typeof changePlanRequestSchema>;

export const publicCompanyStatusSchema = z.enum(['AVAILABLE', 'OVER_LIMIT', 'SUSPENDED']);
export type PublicCompanyStatus = z.infer<typeof publicCompanyStatusSchema>;
