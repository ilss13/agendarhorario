import { MiddlewareConsumer } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppModule } from './app.module';
import { SentryReportingFilter } from '../shared/observability/sentry-exception.filter';
import { TenantInterceptor } from '../shared/tenant/tenant.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CsrfMiddleware } from '../shared/security/csrf.middleware';

describe('AppModule', () => {
  it('registers AppController', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule) as unknown[];
    expect(controllers).toContain(AppController);
  });

  it('registers global filter, guard and interceptor providers', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) as Array<{
      provide: unknown;
      useClass: unknown;
    }>;

    expect(providers).toEqual(
      expect.arrayContaining([
        { provide: APP_FILTER, useClass: SentryReportingFilter },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
      ]),
    );
  });

  it('applies CSRF middleware excluding Stripe webhooks', () => {
    const apply = jest.fn().mockReturnThis();
    const exclude = jest.fn().mockReturnThis();
    const forRoutes = jest.fn();
    const consumer = { apply, exclude, forRoutes } as unknown as MiddlewareConsumer;

    new AppModule().configure(consumer);

    expect(apply).toHaveBeenCalledWith(CsrfMiddleware);
    expect(exclude).toHaveBeenCalledWith('webhooks/stripe', 'api/webhooks/stripe');
    expect(forRoutes).toHaveBeenCalledWith('*');
  });
});
