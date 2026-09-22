import {
  flowFromPath,
  redactTelemetryUrl,
  sentryTraceSampleRate,
  shouldCaptureHttpStatus,
  shouldLogClientHttpStatus,
} from './telemetry';

describe('redactTelemetryUrl', () => {
  it('replaces action tokens', () => {
    expect(redactTelemetryUrl('https://agendarhorario.com/a/secret?x=1')).toBe(
      'https://agendarhorario.com/a/:token?x=1',
    );
  });

  it('redacts sensitive query params', () => {
    expect(redactTelemetryUrl('/api/public/verification/dev-otp?email=a@b.com&phone=1')).toBe(
      '/api/public/verification/dev-otp?email=redacted&phone=redacted',
    );
  });
});

describe('sentryTraceSampleRate', () => {
  it('keeps priority flows and drops health checks', () => {
    expect(sentryTraceSampleRate('GET /api/public/companies/salao/appointments')).toBe(1);
    expect(sentryTraceSampleRate('/dashboard/horarios')).toBe(1);
    expect(sentryTraceSampleRate('GET /api/health')).toBe(0);
  });

  it('samples the rest below the span budget', () => {
    expect(sentryTraceSampleRate('/')).toBe(0.2);
  });
});

describe('flowFromPath', () => {
  it('classifies booking and ignores unknown routes', () => {
    expect(flowFromPath('/p/salao/agendar/1')).toBe('booking');
    expect(flowFromPath('/')).toBe('other');
  });
});
describe('http status reporting', () => {
  it('captures server and network failures', () => {
    expect(shouldCaptureHttpStatus(500)).toBe(true);
    expect(shouldCaptureHttpStatus(0)).toBe(true);
  });

  it('logs recurring client failures without treating auth misses as bugs', () => {
    expect(shouldLogClientHttpStatus(409)).toBe(true);
    expect(shouldLogClientHttpStatus(401)).toBe(false);
    expect(shouldCaptureHttpStatus(409)).toBe(false);
  });
});
