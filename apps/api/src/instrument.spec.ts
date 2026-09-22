const init = jest.fn();
const redactTelemetryUrl = jest.fn((url: string) =>
  url.replace(/([?&](?:token|code|otp)=)[^&]*/gi, '$1redacted'),
);
const sentryTraceSampleRate = jest.fn((name: string | undefined) =>
  /health/i.test(name ?? '') ? 0 : 0.2,
);

jest.mock('@sentry/nestjs', () => ({
  init: (...args: unknown[]) => init(...args),
}));

jest.mock('@agendarhorario/utils', () => ({
  redactTelemetryUrl: (...args: [string]) => redactTelemetryUrl(...args),
  sentryTraceSampleRate: (...args: [string | undefined]) => sentryTraceSampleRate(...args),
}));

describe('instrument', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    init.mockReset();
    redactTelemetryUrl.mockClear();
    sentryTraceSampleRate.mockClear();
    jest.resetModules();
  });

  it('does not initialize Sentry when DSN is missing', async () => {
    delete process.env['SENTRY_DSN'];
    process.env['NODE_ENV'] = 'development';

    await jest.isolateModulesAsync(async () => {
      await import('./instrument');
    });

    expect(init).not.toHaveBeenCalled();
  });

  it('does not initialize Sentry when NODE_ENV is test', async () => {
    process.env['SENTRY_DSN'] = 'https://example.ingest.sentry.io/1';
    process.env['NODE_ENV'] = 'test';

    await jest.isolateModulesAsync(async () => {
      await import('./instrument');
    });

    expect(init).not.toHaveBeenCalled();
  });

  it('initializes Sentry and redacts request urls', async () => {
    process.env['SENTRY_DSN'] = 'https://example.ingest.sentry.io/1';
    process.env['NODE_ENV'] = 'development';
    process.env['SENTRY_ENVIRONMENT'] = 'staging';
    process.env['SENTRY_RELEASE'] = '1.0.0';

    await jest.isolateModulesAsync(async () => {
      await import('./instrument');
    });

    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0][0] as {
      dsn: string;
      environment: string;
      release: string;
      tracesSampler: (ctx: { name?: string }) => number;
      beforeSend: (event: { request?: { url?: string } }) => unknown;
    };

    expect(options.dsn).toBe('https://example.ingest.sentry.io/1');
    expect(options.environment).toBe('staging');
    expect(options.release).toBe('1.0.0');
    expect(options.tracesSampler({ name: 'GET /health' })).toBe(0);
    expect(sentryTraceSampleRate).toHaveBeenCalledWith('GET /health');

    const withUrl = { request: { url: 'https://api.test/login?token=secret' } };
    expect(options.beforeSend(withUrl)).toEqual(withUrl);
    expect(redactTelemetryUrl).toHaveBeenCalledWith('https://api.test/login?token=secret');
    expect(withUrl.request.url).toContain('redacted');

    expect(options.beforeSend({})).toEqual({});
    expect(options.beforeSend({ request: {} })).toEqual({ request: {} });
  });

  it('falls back to NODE_ENV for Sentry environment', async () => {
    process.env['SENTRY_DSN'] = 'https://example.ingest.sentry.io/1';
    process.env['NODE_ENV'] = 'production';
    delete process.env['SENTRY_ENVIRONMENT'];

    await jest.isolateModulesAsync(async () => {
      await import('./instrument');
    });

    const options = init.mock.calls[0][0] as { environment: string };
    expect(options.environment).toBe('production');
  });
});
