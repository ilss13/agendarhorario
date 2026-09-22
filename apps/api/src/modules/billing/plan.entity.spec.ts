import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { Plan } from './plan.entity';

describe('Plan entity', () => {
  it('maps to the plans table', () => {
    const table = getMetadataArgsStorage().tables.find((t) => t.target === Plan);
    expect(table?.name).toBe('plans');
  });

  it('declares unique index on code', () => {
    const indices = getMetadataArgsStorage().indices.filter((i) => i.target === Plan);
    expect(indices.some((i) => i.name === 'uq_plans_code' && i.unique === true)).toBe(true);
  });

  it('declares required billing columns', () => {
    const columns = getMetadataArgsStorage().columns.filter((c) => c.target === Plan);
    const names = columns.map((c) => c.propertyName);
    expect(names).toEqual(
      expect.arrayContaining([
        'code',
        'name',
        'priceBrl',
        'monthlyAppointmentLimit',
        'stripePriceId',
        'active',
        'sortOrder',
      ]),
    );
  });

  it('fails structural check when required fields are missing on a plain object', () => {
    const incomplete = { code: 'basico' } as Partial<Plan>;
    expect(incomplete.name).toBeUndefined();
    expect(incomplete.monthlyAppointmentLimit).toBeUndefined();
  });
});
