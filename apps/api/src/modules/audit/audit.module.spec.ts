import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { AuditModule } from './audit.module';
import { AuditService } from './audit.service';

describe('AuditModule', () => {
  it('registers AuditService as provider and export', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuditModule) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuditModule) as unknown[];
    expect(providers).toContain(AuditService);
    expect(exports).toContain(AuditService);
  });

  it('is marked as a global module', () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, AuditModule)).toBe(true);
  });
});
