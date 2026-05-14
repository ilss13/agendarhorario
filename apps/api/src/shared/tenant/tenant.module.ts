import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantInterceptor } from './tenant.interceptor';

@Global()
@Module({
  providers: [TenantContextService, TenantInterceptor],
  exports: [TenantContextService, TenantInterceptor],
})
export class TenantModule {}
