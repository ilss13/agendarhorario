import {
  PUBLIC_PLAN_OFFERS,
  SUBSCRIPTION_TRIAL_DAYS,
  changePlanRequestSchema,
  checkoutSessionResponseSchema,
  confirmCheckoutRequestSchema,
  planCodeSchema,
  planSchema,
  subscriptionSummarySchema,
} from './billing';

const id = '11111111-1111-4111-8111-111111111111';

const plan = {
  id,
  code: 'basico' as const,
  name: 'Básico',
  priceBrl: 39.9,
  monthlyAppointmentLimit: 25,
  stripePriceId: 'price_1',
  sortOrder: 1,
  trialDays: 14,
};

describe('billing contracts', () => {
  it('publishes four plan offers and a 14-day trial', () => {
    expect(SUBSCRIPTION_TRIAL_DAYS).toBe(14);
    expect(PUBLIC_PLAN_OFFERS.map((offer) => offer.code)).toEqual([
      'basico',
      'medio',
      'grande',
      'super',
    ]);
    expect(planCodeSchema.safeParse('basico').success).toBe(true);
    expect(planSchema.safeParse(plan).success).toBe(true);
  });

  it('accepts a subscription without a plan and a checkout confirmation without session', () => {
    expect(
      subscriptionSummarySchema.safeParse({
        hasSubscription: false,
        plan: null,
        status: null,
        state: 'NO_SUBSCRIPTION',
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEligible: true,
        trialEndsAt: null,
        trialDays: 14,
        usage: { used: 0, limit: 0, resetAt: null },
      }).success,
    ).toBe(true);
    expect(confirmCheckoutRequestSchema.safeParse({}).success).toBe(true);
    expect(confirmCheckoutRequestSchema.safeParse({ sessionId: 'cs_1' }).success).toBe(true);
    expect(checkoutSessionResponseSchema.safeParse({ url: 'https://pay.example/cs' }).success).toBe(
      true,
    );
    expect(changePlanRequestSchema.safeParse({ planCode: 'medio' }).success).toBe(true);
  });

  it('rejects an unknown plan and a checkout url that is not absolute', () => {
    expect(planCodeSchema.safeParse('gratis').success).toBe(false);
    expect(checkoutSessionResponseSchema.safeParse({ url: 'nao-e-url' }).success).toBe(false);
    expect(changePlanRequestSchema.safeParse({ planCode: 'gratis' }).success).toBe(false);
    expect(planSchema.safeParse({ ...plan, trialDays: -1 }).success).toBe(false);
  });
});
