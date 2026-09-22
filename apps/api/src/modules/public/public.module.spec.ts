import { MODULE_METADATA } from '@nestjs/common/constants';
import { PublicModule } from './public.module';
import { PublicCompaniesController } from './public.controller';

describe('PublicModule', () => {
  it('registers PublicCompaniesController', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, PublicModule) as unknown[];
    expect(controllers).toContain(PublicCompaniesController);
  });

  it('imports availability and appointments modules', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, PublicModule) as unknown[];
    expect(imports.length).toBe(3);
  });
});
