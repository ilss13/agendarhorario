import { MODULE_METADATA } from '@nestjs/common/constants';
import { CompaniesController } from './companies.controller';
import { CompaniesModule } from './companies.module';
import { CompaniesService } from './companies.service';

describe('CompaniesModule', () => {
  it('registers controller, provider and export', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      CompaniesModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CompaniesModule) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, CompaniesModule) as unknown[];

    expect(controllers).toContain(CompaniesController);
    expect(providers).toContain(CompaniesService);
    expect(exports).toContain(CompaniesService);
  });
});
