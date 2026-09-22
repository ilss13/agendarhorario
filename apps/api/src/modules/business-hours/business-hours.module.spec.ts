import { MODULE_METADATA } from '@nestjs/common/constants';
import { BusinessHoursModule } from './business-hours.module';
import { BusinessHoursController } from './business-hours.controller';
import { BusinessExceptionsController } from './business-exceptions.controller';
import { BusinessHoursService } from './business-hours.service';
import { BusinessExceptionsService } from './business-exceptions.service';

describe('BusinessHoursModule', () => {
  it('registers hours and exceptions controllers and services', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      BusinessHoursModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      BusinessHoursModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, BusinessHoursModule) as unknown[];

    expect(controllers).toEqual(
      expect.arrayContaining([BusinessHoursController, BusinessExceptionsController]),
    );
    expect(providers).toEqual(
      expect.arrayContaining([BusinessHoursService, BusinessExceptionsService]),
    );
    expect(exports).toEqual(
      expect.arrayContaining([BusinessHoursService, BusinessExceptionsService]),
    );
  });

  it('imports TypeOrm feature entities', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, BusinessHoursModule) as unknown[];
    expect(imports.length).toBe(1);
  });
});
