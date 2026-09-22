import { environment } from './environment';

describe('environment', () => {
  it('exposes the development flag and a Sentry DSN', () => {
    expect(environment.production).toBe(false);
    expect(environment.sentryDsn).toContain('sentry.io');
  });
});
