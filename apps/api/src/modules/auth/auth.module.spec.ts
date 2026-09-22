import { MODULE_METADATA } from '@nestjs/common/constants';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';

describe('AuthModule', () => {
  it('registers AuthController', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuthModule) as unknown[];
    expect(controllers).toContain(AuthController);
  });

  it('provides AuthService, AuthGuard and APP_GUARD', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule) as Array<
      unknown | { provide: unknown; useClass: unknown }
    >;
    expect(providers).toContain(AuthService);
    expect(providers).toContain(AuthGuard);
    const appGuard = providers.find(
      (p): p is { provide: unknown; useClass: unknown } =>
        typeof p === 'object' && p !== null && 'provide' in p && p.provide === APP_GUARD,
    );
    expect(appGuard?.useClass).toBe(AuthGuard);
  });

  it('exports AuthService', () => {
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthModule) as unknown[];
    expect(exports).toContain(AuthService);
  });
});
