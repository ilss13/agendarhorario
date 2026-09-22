import { PLAN_CATALOG, type PlanDefinition } from './plan-catalog';
import type { PlanCode } from './plan.entity';

describe('PLAN_CATALOG', () => {
  const expectedCodes: PlanCode[] = ['basico', 'medio', 'grande', 'super'];

  it('exposes exactly the four plan codes in ascending sortOrder', () => {
    expect(PLAN_CATALOG.map((p) => p.code)).toEqual(expectedCodes);
    const orders = PLAN_CATALOG.map((p) => p.sortOrder);
    expect(orders).toEqual([1, 2, 3, 4]);
  });

  it.each(PLAN_CATALOG)(
    'defines positive price and appointment limit for $code',
    (plan: PlanDefinition) => {
      expect(plan.name.length).toBeGreaterThan(0);
      expect(plan.priceBrl).toBeGreaterThan(0);
      expect(plan.monthlyAppointmentLimit).toBeGreaterThan(0);
      expect(expectedCodes).toContain(plan.code);
    },
  );

  it('keeps appointment limits strictly increasing with price', () => {
    for (let i = 1; i < PLAN_CATALOG.length; i++) {
      expect(PLAN_CATALOG[i].priceBrl).toBeGreaterThan(PLAN_CATALOG[i - 1].priceBrl);
      expect(PLAN_CATALOG[i].monthlyAppointmentLimit).toBeGreaterThan(
        PLAN_CATALOG[i - 1].monthlyAppointmentLimit,
      );
    }
  });

  it('matches known commercial values for each plan', () => {
    expect(PLAN_CATALOG.find((p) => p.code === 'basico')).toMatchObject({
      name: 'Básico',
      priceBrl: 39.9,
      monthlyAppointmentLimit: 25,
    });
    expect(PLAN_CATALOG.find((p) => p.code === 'medio')).toMatchObject({
      name: 'Médio',
      priceBrl: 79.9,
      monthlyAppointmentLimit: 50,
    });
    expect(PLAN_CATALOG.find((p) => p.code === 'grande')).toMatchObject({
      name: 'Grande',
      priceBrl: 149.9,
      monthlyAppointmentLimit: 100,
    });
    expect(PLAN_CATALOG.find((p) => p.code === 'super')).toMatchObject({
      name: 'Super',
      priceBrl: 249.9,
      monthlyAppointmentLimit: 250,
    });
  });
});
