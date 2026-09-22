import * as Sentry from '@sentry/angular';
import { redactTelemetryUrl, sentryTraceSampleRate } from '@agendarhorario/utils';
import { environment } from './environments/environment';

if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    sendDefaultPii: false,
    enableLogs: true,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampler: (ctx) => sentryTraceSampleRate(ctx.name),
    tracePropagationTargets: [/localhost/, /agendarhorario\.com/, /\/api\//],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    beforeSend(event) {
      const url = event.request?.url;
      if (event.request && url) {
        event.request.url = redactTelemetryUrl(url);
      }
      return event;
    },
  });
}
