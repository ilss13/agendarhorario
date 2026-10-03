import { SUBSCRIPTION_TRIAL_DAYS, uuidSchema } from '../index';

describe('contracts barrel', () => {
  it('re-exports public schemas', () => {
    expect(SUBSCRIPTION_TRIAL_DAYS).toBe(14);
    expect(uuidSchema.safeParse('11111111-1111-4111-8111-111111111111').success).toBe(true);
  });
});
