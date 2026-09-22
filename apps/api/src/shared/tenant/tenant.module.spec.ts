import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { TenantContextService } from './tenant-context.service';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantModule } from './tenant.module';

describe('TenantModule', () => {
  it('is marked as a global module', () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, TenantModule)).toBe(true);
  });

  it('registers tenant providers', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, TenantModule)).toEqual([
      TenantContextService,
      TenantInterceptor,
    ]);
  });

  it('exports tenant providers', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, TenantModule)).toEqual([
      TenantContextService,
      TenantInterceptor,
    ]);
  });
});
