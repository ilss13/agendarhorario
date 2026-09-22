import { MODULE_METADATA } from '@nestjs/common/constants';
import { VerificationController } from './verification.controller';
import { VerificationModule } from './verification.module';
import { VerificationService } from './verification.service';

describe('VerificationModule', () => {
  it('registers controller, provider and export', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      VerificationModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      VerificationModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, VerificationModule) as unknown[];

    expect(controllers).toContain(VerificationController);
    expect(providers).toContain(VerificationService);
    expect(exports).toContain(VerificationService);
  });
});
