import * as Sentry from '@sentry/nestjs';
import { redactTelemetryUrl, sentryTraceSampleRate } from '@agendarhorario/utils';

const dsn = process.env['SENTRY_DSN'];

if (dsn && process.env['NODE_ENV'] !== 'test') {
  Sentry.init({
    dsn,
    environment: process.env['SENTRY_ENVIRONMENT'] ?? process.env['NODE_ENV'] ?? 'development',
    release: process.env['SENTRY_RELEASE'],
    enableLogs: true,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampler: (ctx) => sentryTraceSampleRate(ctx.name),
    beforeSend(event) {
      const url = event.request?.url;
      if (event.request && url) {
        event.request.url = redactTelemetryUrl(url);
      }
      return event;
    },
  });
}
