import * as Sentry from '@sentry/angular';

export function trackBooking(message: string, data?: Record<string, string | number>): void {
  if (!Sentry.getClient()) return;
  Sentry.addBreadcrumb({ category: 'booking', level: 'info', message, data });
}
