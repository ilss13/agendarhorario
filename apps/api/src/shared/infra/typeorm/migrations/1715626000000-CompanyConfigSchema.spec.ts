import type { QueryRunner } from 'typeorm';
import { CompanyConfigSchema1715626000000 } from './1715626000000-CompanyConfigSchema';

describe('CompanyConfigSchema1715626000000', () => {
  const migration = new CompanyConfigSchema1715626000000();

  it('exposes the migration name', () => {
    expect(migration.name).toBe('CompanyConfigSchema1715626000000');
  });

  it('runs up SQL creating services, business_hours and business_exceptions', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ query } as unknown as QueryRunner);

    expect(query.mock.calls.length).toBe(3);
    expect(String(query.mock.calls[0]?.[0])).toContain('CREATE TABLE `services`');
    expect(String(query.mock.calls[1]?.[0])).toContain('CREATE TABLE `business_hours`');
    expect(String(query.mock.calls[2]?.[0])).toContain('CREATE TABLE `business_exceptions`');
  });

  it('runs down SQL dropping tables in reverse order', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.down({ query } as unknown as QueryRunner);

    expect(query.mock.calls.map((c) => c[0])).toEqual([
      'DROP TABLE `business_exceptions`',
      'DROP TABLE `business_hours`',
      'DROP TABLE `services`',
    ]);
  });
});
