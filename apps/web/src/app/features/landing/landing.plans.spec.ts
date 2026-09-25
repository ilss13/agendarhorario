import type { PublicPlanOffer } from '@agendarhorario/contracts';
import { LANDING_PLAN_CARDS, landingPlanCards } from './landing.plans';

describe('landingPlanCards', () => {
  it('lists the commercial catalog with prices and highlights the middle plan', () => {
    expect(LANDING_PLAN_CARDS.map((plan) => [plan.code, plan.name, plan.priceBrl])).toEqual([
      ['basico', 'Básico', 39.9],
      ['medio', 'Médio', 79.9],
      ['grande', 'Grande', 149.9],
      ['super', 'Super', 249.9],
    ]);
    expect(LANDING_PLAN_CARDS.find((plan) => plan.highlight)?.code).toBe('medio');
    expect(LANDING_PLAN_CARDS.every((plan) => plan.monthlyAppointmentLimit > 0)).toBe(true);
  });

  it('keeps an unknown offer visible without marketing copy', () => {
    const unknown: PublicPlanOffer = {
      code: 'basico',
      name: 'Outro',
      priceBrl: 10,
      monthlyAppointmentLimit: 1,
      sortOrder: 9,
    };
    const [card] = landingPlanCards([
      { ...unknown, code: 'inexistente' as PublicPlanOffer['code'] },
    ]);
    expect(card).toMatchObject({
      name: 'Outro',
      priceBrl: 10,
      tagline: '',
      highlight: false,
      features: [],
    });
  });
});
