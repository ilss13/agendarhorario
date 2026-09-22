jest.mock('@sentry/angular', () => ({
  setTag: jest.fn(),
  createErrorHandler: jest.fn(() => ({ handleError: () => undefined })),
  TraceService: class TraceService {},
}));

import { APP_INITIALIZER } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app.config';
import { AuthService } from './core/auth/auth.service';

type FactoryProvider = {
  provide: unknown;
  useFactory: (...args: unknown[]) => () => unknown;
  deps?: unknown[];
};

describe('appConfig', () => {
  const initializers = (): FactoryProvider[] =>
    appConfig.providers.filter((provider): provider is FactoryProvider => {
      return (
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === APP_INITIALIZER &&
        'useFactory' in provider
      );
    });

  it('tags the active flow after a navigation ends', () => {
    const setTag = Sentry.setTag as jest.Mock;
    setTag.mockClear();
    const events = new Subject<NavigationStart | NavigationEnd>();
    const tracing = initializers().find((provider) => provider.deps?.includes(Router));
    tracing?.useFactory({}, { events } as unknown as Router)();
    events.next(new NavigationStart(1, '/login'));
    events.next(new NavigationEnd(1, '/login', '/dashboard/empresa'));
    expect(setTag).toHaveBeenCalledWith('flow', 'dashboard');
  });

  it('waits for the auth session before the app starts', async () => {
    const auth = initializers().find((provider) => provider.deps?.includes(AuthService));
    const initialize = jest.fn(() => of({ id: 'user' }));
    await auth?.useFactory({ initialize } as unknown as AuthService)();
    expect(initialize).toHaveBeenCalled();
  });
});
