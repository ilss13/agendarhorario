const init = jest.fn();

jest.mock('@sentry/angular', () => ({
  init: (...args: unknown[]) => init(...args),
  browserTracingIntegration: () => ({ name: 'tracing' }),
  replayIntegration: () => ({ name: 'replay' }),
}));

describe('sentry bootstrap', () => {
  it('initializes Sentry and redacts request urls', async () => {
    await import('./sentry');
    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0][0] as {
      environment: string;
      tracesSampler: (ctx: { name?: string }) => number;
      beforeSend: (event: { request?: { url?: string } }) => unknown;
    };
    expect(options.environment).toBe('development');
    expect(options.tracesSampler({ name: 'GET /api/health' })).toBe(0);
    expect(options.tracesSampler({ name: 'GET /api/auth/me' })).toBe(1);
    expect(options.tracesSampler({})).toBe(0.2);

    const event = { request: { url: 'https://app.test/api/auth/login?token=secret' } };
    options.beforeSend(event);
    expect(event.request.url).toContain('token=redacted');
    expect(options.beforeSend({})).toEqual({});
    expect(options.beforeSend({ request: {} })).toEqual({ request: {} });
  });
});
