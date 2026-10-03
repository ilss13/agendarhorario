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

  it('keeps an unparseable url and redacts appointment action tokens', () => {
    expect(redactTelemetryUrl('http://[')).toBe('http://[');
    expect(redactTelemetryUrl('/appointments/action/secret#ok')).toBe(
      '/appointments/action/:token#ok',
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
    expect(sentryTraceSampleRate(undefined)).toBe(0.2);
  });
});

describe('flowFromPath', () => {
  it('classifies booking and ignores unknown routes', () => {
    expect(flowFromPath('/p/salao/agendar/1')).toBe('booking');
    expect(flowFromPath('/public/companies/salao')).toBe('booking');
    expect(flowFromPath('/a/token')).toBe('action_link');
    expect(flowFromPath('/appointments/action/token')).toBe('action_link');
    expect(flowFromPath('/dashboard')).toBe('dashboard');
    expect(flowFromPath('/admin')).toBe('dashboard');
    expect(flowFromPath('/company')).toBe('dashboard');
    expect(flowFromPath('/login')).toBe('auth');
    expect(flowFromPath('/registrar')).toBe('auth');
    expect(flowFromPath('/auth')).toBe('auth');
    expect(flowFromPath('/billing')).toBe('billing');
    expect(flowFromPath('/me')).toBe('me');
    expect(flowFromPath('/')).toBe('other');
  });
});
describe('http status reporting', () => {
  it('captures server and network failures', () => {
    expect(shouldCaptureHttpStatus(500)).toBe(true);
    expect(shouldCaptureHttpStatus(0)).toBe(true);
  });

  it('logs recurring client failures without treating auth misses as bugs', () => {
    expect(shouldLogClientHttpStatus(400)).toBe(true);
    expect(shouldLogClientHttpStatus(409)).toBe(true);
    expect(shouldLogClientHttpStatus(422)).toBe(true);
    expect(shouldLogClientHttpStatus(429)).toBe(true);
    expect(shouldLogClientHttpStatus(401)).toBe(false);
    expect(shouldCaptureHttpStatus(409)).toBe(false);
  });
});
