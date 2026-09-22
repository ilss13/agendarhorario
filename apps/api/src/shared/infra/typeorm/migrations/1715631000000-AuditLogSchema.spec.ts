import type { QueryRunner } from 'typeorm';
import { AuditLogSchema1715631000000 } from './1715631000000-AuditLogSchema';

describe('AuditLogSchema1715631000000', () => {
  const migration = new AuditLogSchema1715631000000();

  it('exposes the migration name', () => {
    expect(migration.name).toBe('AuditLogSchema1715631000000');
  });

  it('runs up SQL creating audit_logs', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0])).toContain('CREATE TABLE `audit_logs`');
  });

  it('runs down SQL dropping audit_logs', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.down({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledWith('DROP TABLE `audit_logs`');
  });
});
