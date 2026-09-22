jest.mock('dotenv', () => ({ config: jest.fn() }));

const dataSourceInstances: Array<{ options: Record<string, unknown> }> = [];

jest.mock('typeorm', () => {
  const actual = jest.requireActual<typeof import('typeorm')>('typeorm');
  return {
    ...actual,
    DataSource: jest.fn().mockImplementation((options: Record<string, unknown>) => {
      const instance = { options };
      dataSourceInstances.push(instance);
      return instance;
    }),
  };
});

describe('AppDataSource', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    dataSourceInstances.length = 0;
  });

  it('builds mysql DataSource with defaults when env is absent', async () => {
    delete process.env['DB_HOST'];
    delete process.env['DB_PORT'];
    delete process.env['DB_USER'];
    delete process.env['DB_PASSWORD'];
    delete process.env['DB_NAME'];
    delete process.env['DB_LOGGING'];

    const { AppDataSource } = await import('./data-source');

    expect(AppDataSource.options).toMatchObject({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'app',
      password: 'app',
      database: 'agendarhorario',
      synchronize: false,
      logging: false,
      timezone: 'Z',
      charset: 'utf8mb4_unicode_ci',
    });
    expect(AppDataSource.options.entities).toHaveLength(15);
  });

  it('maps DB_* env vars and enables logging when DB_LOGGING=true', async () => {
    process.env['DB_HOST'] = 'db.host';
    process.env['DB_PORT'] = '3307';
    process.env['DB_USER'] = 'u';
    process.env['DB_PASSWORD'] = 'p';
    process.env['DB_NAME'] = 'n';
    process.env['DB_LOGGING'] = 'true';

    const { AppDataSource } = await import('./data-source');

    expect(AppDataSource.options).toMatchObject({
      host: 'db.host',
      port: 3307,
      username: 'u',
      password: 'p',
      database: 'n',
      logging: true,
    });
  });
});
