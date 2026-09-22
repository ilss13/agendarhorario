import { MODULE_METADATA } from '@nestjs/common/constants';
import { MeAccountController } from './me-account.controller';
import { MeAccountService } from './me-account.service';
import { MeModule } from './me.module';
import { MyAppointmentsController } from './my-appointments.controller';
import { MyAppointmentsService } from './my-appointments.service';

describe('MeModule', () => {
  it('registers controllers', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, MeModule) as unknown[];
    expect(controllers).toEqual(
      expect.arrayContaining([MyAppointmentsController, MeAccountController]),
    );
  });

  it('registers providers', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, MeModule) as unknown[];
    expect(providers).toEqual(expect.arrayContaining([MyAppointmentsService, MeAccountService]));
  });

  it('imports TypeORM feature entities', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, MeModule) as unknown[];
    expect(imports.length).toBeGreaterThan(0);
  });
});
