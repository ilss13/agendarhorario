describe('main bootstrap', () => {
  const listen = jest.fn();
  const use = jest.fn();
  const useLogger = jest.fn();
  const setGlobalPrefix = jest.fn();
  const enableCors = jest.fn();
  const useGlobalPipes = jest.fn();
  const get = jest.fn();
  const setTrustProxy = jest.fn();
  const create = jest.fn();
  const createDocument = jest.fn();
  const setup = jest.fn();
  const helmet = jest.fn((_options?: unknown) => 'helmet-mw');
  const compression = jest.fn(() => 'compression-mw');
  const cookieParser = jest.fn(() => 'cookie-mw');
  const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  const configValues: Record<string, string | number | undefined> = {
    API_GLOBAL_PREFIX: 'api',
    API_PORT: 3000,
    WEB_ORIGIN: 'http://localhost:4200',
    NODE_ENV: 'development',
  };

  const buildApp = () => ({
    useLogger,
    get,
    setGlobalPrefix,
    use,
    enableCors,
    useGlobalPipes,
    listen,
    getHttpAdapter: () => ({
      getInstance: () => ({ set: setTrustProxy }),
    }),
  });

  beforeEach(() => {
    jest.resetModules();
    listen.mockReset().mockResolvedValue(undefined);
    use.mockReset();
    useLogger.mockReset();
    setGlobalPrefix.mockReset();
    enableCors.mockReset();
    useGlobalPipes.mockReset();
    get.mockReset();
    setTrustProxy.mockReset();
    create.mockReset().mockResolvedValue(buildApp());
    createDocument.mockReset().mockReturnValue({ openapi: '3.0.0' });
    setup.mockReset();
    helmet.mockClear();
    compression.mockClear();
    cookieParser.mockClear();
    consoleLog.mockClear();

    get.mockImplementation((token: unknown) => {
      if (typeof token === 'function' && token.name === 'ConfigService') {
        return {
          get: (key: string) => configValues[key],
        };
      }
      if (typeof token === 'function' && token.name === 'Logger') {
        return { logger: true };
      }
      return {
        get: (key: string) => configValues[key],
      };
    });

    jest.doMock('./instrument', () => ({}));
    jest.doMock('./app/app.module', () => ({ AppModule: class AppModule {} }));
    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create: (...args: unknown[]) => create(...args) },
    }));
    jest.doMock('@nestjs/swagger', () => ({
      DocumentBuilder: class {
        setTitle() {
          return this;
        }
        setVersion() {
          return this;
        }
        build() {
          return { title: 'Agendar Horário API' };
        }
      },
      SwaggerModule: {
        createDocument: (...args: unknown[]) => createDocument(...args),
        setup: (...args: unknown[]) => setup(...args),
      },
    }));
    jest.doMock('helmet', () => ({
      __esModule: true,
      default: (options?: unknown) => helmet(options),
    }));
    jest.doMock('compression', () => ({
      __esModule: true,
      default: () => compression(),
    }));
    jest.doMock('cookie-parser', () => ({
      __esModule: true,
      default: () => cookieParser(),
    }));
    jest.doMock('nestjs-pino', () => ({
      Logger: class Logger {},
    }));
    jest.doMock('@nestjs/common', () => {
      const actual = jest.requireActual('@nestjs/common') as typeof import('@nestjs/common');
      return {
        ...actual,
        ValidationPipe: actual.ValidationPipe,
      };
    });
    jest.doMock('@nestjs/config', () => ({
      ConfigService: class ConfigService {},
    }));
  });

  afterAll(() => {
    consoleLog.mockRestore();
  });

  const importMain = async (): Promise<void> => {
    await import('./main');
    await new Promise((resolve) => setImmediate(resolve));
  };

  it('bootstraps the API with swagger in non-production', async () => {
    configValues.NODE_ENV = 'development';
    await importMain();

    expect(create).toHaveBeenCalledWith(expect.any(Function), {
      bufferLogs: true,
      rawBody: true,
    });
    expect(setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(setTrustProxy).toHaveBeenCalledWith('trust proxy', 1);
    expect(helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: false,
        strictTransportSecurity: false,
      }),
    );
    expect(setup).toHaveBeenCalledWith('api/docs', expect.anything(), expect.anything());
    expect(listen).toHaveBeenCalledWith(3000);
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/api'));
  });

  it('enables production helmet CSP and skips swagger', async () => {
    configValues.NODE_ENV = 'production';
    await importMain();

    expect(helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: expect.objectContaining({
          useDefaults: true,
        }),
        strictTransportSecurity: expect.objectContaining({ maxAge: 15552000 }),
      }),
    );
    expect(setup).not.toHaveBeenCalled();
    expect(listen).toHaveBeenCalledWith(3000);
  });

  it('skips trust proxy when the HTTP adapter has no set method', async () => {
    create.mockResolvedValue({
      ...buildApp(),
      getHttpAdapter: () => ({
        getInstance: () => ({}),
      }),
    });

    await importMain();

    expect(setTrustProxy).not.toHaveBeenCalled();
    expect(listen).toHaveBeenCalledWith(3000);
  });

  it('uses default port and prefix when config is empty', async () => {
    configValues.API_GLOBAL_PREFIX = undefined;
    configValues.API_PORT = undefined;
    configValues.WEB_ORIGIN = undefined;
    configValues.NODE_ENV = 'development';
    await importMain();

    expect(setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(listen).toHaveBeenCalledWith(3000);
    expect(enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'http://localhost:4200' }),
    );
  });
});
