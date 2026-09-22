import type { QueryRunner } from 'typeorm';
import { InitialSchema1715625000000 } from './1715625000000-InitialSchema';

describe('InitialSchema1715625000000', () => {
  const migration = new InitialSchema1715625000000();

  it('exposes the migration name', () => {
    expect(migration.name).toBe('InitialSchema1715625000000');
  });

  it('runs up SQL to create companies and users', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await migration.up(queryRunner);

    expect(query).toHaveBeenCalled();
    expect(query.mock.calls.length).toBe(2);
    expect(String(query.mock.calls[0]?.[0])).toContain('CREATE TABLE `companies`');
    expect(String(query.mock.calls[1]?.[0])).toContain('CREATE TABLE `users`');
  });

  it('runs down SQL to drop users then companies', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await migration.down(queryRunner);

    expect(query).toHaveBeenCalledWith('DROP TABLE `users`');
    expect(query).toHaveBeenCalledWith('DROP TABLE `companies`');
  });
});
