import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { loadConfig } from '../shared/config/configuration';
import { envValidationSchema } from '../shared/config/validation.schema';
import { FirebaseAdminModule } from '../shared/infra/firebase/firebase-admin.module';
import { typeOrmConfigFactory } from '../shared/infra/typeorm/typeorm-config.factory';
import { CsrfMiddleware } from '../shared/security/csrf.middleware';
import { TenantInterceptor } from '../shared/tenant/tenant.interceptor';
import { TenantModule } from '../shared/tenant/tenant.module';
import { AppointmentsModule } from '../modules/appointments/appointments.module';
import { AuthModule } from '../modules/auth/auth.module';
import { AvailabilityModule } from '../modules/availability/availability.module';
import { BillingModule } from '../modules/billing/billing.module';
import { BusinessHoursModule } from '../modules/business-hours/business-hours.module';
import { CompaniesModule } from '../modules/companies/companies.module';
import { MeModule } from '../modules/me/me.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { PublicModule } from '../modules/public/public.module';
import { ServicesModule } from '../modules/services/services.module';
import { VerificationModule } from '../modules/verification/verification.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            config.get<string>('NODE_ENV') === 'production'
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
            remove: true,
          },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfigFactory,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL_MS') ?? 60_000,
          limit: config.get<number>('THROTTLE_LIMIT') ?? 120,
        },
      ],
    }),
    FirebaseAdminModule,
    TenantModule,
    NotificationsModule,
    AuthModule,
    CompaniesModule,
    ServicesModule,
    BusinessHoursModule,
    AvailabilityModule,
    VerificationModule,
    AppointmentsModule,
    PublicModule,
    MeModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfMiddleware).exclude('webhooks/stripe', 'api/webhooks/stripe').forRoutes('*');
  }
}
