import { ConfigService } from '@nestjs/config';
import { typeOrmConfigFactory } from './typeorm-config.factory';

describe('typeOrmConfigFactory', () => {
  it('builds TypeORM options from ConfigService', () => {
    const config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string | number | boolean> = {
          DB_HOST: 'db',
          DB_PORT: 3306,
          DB_USER: 'app',
          DB_PASSWORD: 'secret',
          DB_NAME: 'agendarhorario',
          DB_SYNCHRONIZE: false,
          DB_LOGGING: false,
        };
        return map[key];
      }),
    } as unknown as ConfigService;

    const options = typeOrmConfigFactory(config);

    expect(options).toMatchObject({
      type: 'mysql',
      host: 'db',
      port: 3306,
      username: 'app',
      password: 'secret',
      database: 'agendarhorario',
      migrationsRun: false,
      synchronize: false,
      logging: false,
      timezone: 'Z',
      charset: 'utf8mb4_unicode_ci',
      autoLoadEntities: true,
    });
    expect(options.entities).toHaveLength(15);
  });

  it('enables synchronize and logging only when config values are strictly true', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'DB_SYNCHRONIZE') return true;
        if (key === 'DB_LOGGING') return true;
        return undefined;
      }),
    } as unknown as ConfigService;

    const options = typeOrmConfigFactory(config);

    expect(options.synchronize).toBe(true);
    expect(options.logging).toBe(true);
  });

  it('keeps synchronize false when DB_SYNCHRONIZE is a truthy non-boolean', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'DB_SYNCHRONIZE') return 'true';
        if (key === 'DB_LOGGING') return 'true';
        return undefined;
      }),
    } as unknown as ConfigService;

    const options = typeOrmConfigFactory(config);

    expect(options.synchronize).toBe(false);
    expect(options.logging).toBe(false);
  });
});
