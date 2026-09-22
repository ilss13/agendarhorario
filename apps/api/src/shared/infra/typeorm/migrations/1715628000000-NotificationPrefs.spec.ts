import type { QueryRunner } from 'typeorm';
import { NotificationPrefs1715628000000 } from './1715628000000-NotificationPrefs';

describe('NotificationPrefs1715628000000', () => {
  const migration = new NotificationPrefs1715628000000();

  it('exposes the migration name', () => {
    expect(migration.name).toBe('NotificationPrefs1715628000000');
  });

  it('runs up SQL migrating notificationToggles to notificationPrefs', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ query } as unknown as QueryRunner);

    expect(query.mock.calls.length).toBe(3);
    expect(String(query.mock.calls[0]?.[0])).toContain('notificationPrefs');
    expect(String(query.mock.calls[2]?.[0])).toContain('DROP COLUMN `notificationToggles`');
  });

  it('runs down SQL restoring notificationToggles', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.down({ query } as unknown as QueryRunner);

    expect(query.mock.calls.length).toBe(3);
    expect(String(query.mock.calls[0]?.[0])).toContain('notificationToggles');
    expect(String(query.mock.calls[2]?.[0])).toContain('DROP COLUMN `notificationPrefs`');
  });
});
