import type { QueryRunner } from 'typeorm';
import { NotificationLog1715629000000 } from './1715629000000-NotificationLog';

describe('NotificationLog1715629000000', () => {
  const migration = new NotificationLog1715629000000();

  it('exposes the migration name', () => {
    expect(migration.name).toBe('NotificationLog1715629000000');
  });

  it('runs up SQL creating notification_logs', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0])).toContain('CREATE TABLE `notification_logs`');
  });

  it('runs down SQL dropping notification_logs', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.down({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledWith('DROP TABLE `notification_logs`');
  });
});
