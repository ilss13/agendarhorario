import type { QueryRunner } from 'typeorm';
import { PublicBookingSchema1715627000000 } from './1715627000000-PublicBookingSchema';

describe('PublicBookingSchema1715627000000', () => {
  const migration = new PublicBookingSchema1715627000000();

  it('exposes the migration name', () => {
    expect(migration.name).toBe('PublicBookingSchema1715627000000');
  });

  it('runs up SQL creating booking-related tables', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ query } as unknown as QueryRunner);

    expect(query.mock.calls.length).toBe(4);
    expect(String(query.mock.calls[0]?.[0])).toContain('CREATE TABLE `customers`');
    expect(String(query.mock.calls[1]?.[0])).toContain('CREATE TABLE `appointments`');
    expect(String(query.mock.calls[2]?.[0])).toContain('CREATE TABLE `verifications`');
    expect(String(query.mock.calls[3]?.[0])).toContain('CREATE TABLE `appointment_action_tokens`');
  });

  it('runs down SQL dropping booking tables', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.down({ query } as unknown as QueryRunner);

    expect(query.mock.calls.map((c) => c[0])).toEqual([
      'DROP TABLE `appointment_action_tokens`',
      'DROP TABLE `verifications`',
      'DROP TABLE `appointments`',
      'DROP TABLE `customers`',
    ]);
  });
});
