import { MODULE_METADATA } from '@nestjs/common/constants';
import { ServicesModule } from './services.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

describe('ServicesModule', () => {
  it('registers controller, provider and export', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ServicesModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ServicesModule) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, ServicesModule) as unknown[];

    expect(controllers).toContain(ServicesController);
    expect(providers).toContain(ServicesService);
    expect(exports).toContain(ServicesService);
  });

  it('imports TypeOrm feature for Service', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ServicesModule) as unknown[];
    expect(imports.length).toBe(1);
  });
});
