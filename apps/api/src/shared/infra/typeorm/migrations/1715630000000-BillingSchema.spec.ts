import type { QueryRunner } from 'typeorm';
import { BillingSchema1715630000000 } from './1715630000000-BillingSchema';

describe('BillingSchema1715630000000', () => {
  const migration = new BillingSchema1715630000000();

  it('exposes the migration name', () => {
    expect(migration.name).toBe('BillingSchema1715630000000');
  });

  it('runs up SQL adding stripe columns and billing tables', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ query } as unknown as QueryRunner);

    expect(query.mock.calls.length).toBe(5);
    expect(String(query.mock.calls[0]?.[0])).toContain('stripeCustomerId');
    expect(String(query.mock.calls[1]?.[0])).toContain('CREATE TABLE `plans`');
    expect(String(query.mock.calls[2]?.[0])).toContain('CREATE TABLE `subscriptions`');
    expect(String(query.mock.calls[3]?.[0])).toContain('CREATE TABLE `invoices`');
    expect(String(query.mock.calls[4]?.[0])).toContain('CREATE TABLE `billing_events`');
  });

  it('runs down SQL dropping billing tables and stripe columns', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.down({ query } as unknown as QueryRunner);

    expect(query.mock.calls.map((c) => c[0])).toEqual([
      'DROP TABLE `billing_events`',
      'DROP TABLE `invoices`',
      'DROP TABLE `subscriptions`',
      'DROP TABLE `plans`',
      'ALTER TABLE `companies` DROP COLUMN `stripeCustomerId`, DROP COLUMN `stripeSubscriptionId`',
    ]);
  });
});
