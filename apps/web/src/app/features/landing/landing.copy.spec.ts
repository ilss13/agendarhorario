import { SUBSCRIPTION_TRIAL_DAYS } from '@agendarhorario/contracts';
import { LANDING_COPY } from './landing.copy';

describe('LANDING_COPY', () => {
  it('lists the four plans and mentions the trial', () => {
    expect(LANDING_COPY.pricing.plans.map((plan) => plan.code)).toEqual([
      'basico',
      'medio',
      'grande',
      'super',
    ]);
    expect(LANDING_COPY.pricing.plans.filter((plan) => plan.highlight)).toHaveLength(1);
    expect(LANDING_COPY.hero.primaryCta).toContain(String(SUBSCRIPTION_TRIAL_DAYS));
    expect(
      LANDING_COPY.faq.items.some((item) => item.a.includes(String(SUBSCRIPTION_TRIAL_DAYS))),
    ).toBe(true);
    expect(LANDING_COPY.footer.links.map((link) => link.href)).toEqual([
      '/termos',
      '/privacidade',
      'mailto:suporte@agendarhorario.com',
    ]);
  });
});
