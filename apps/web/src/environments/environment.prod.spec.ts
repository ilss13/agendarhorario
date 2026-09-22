import { environment } from './environment.prod';

describe('environment.prod', () => {
  it('marks the build as production', () => {
    expect(environment.production).toBe(true);
    expect(environment.sentryDsn).toContain('sentry.io');
  });
});
