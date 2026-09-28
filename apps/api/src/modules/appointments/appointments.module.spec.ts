import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppointmentsModule } from './appointments.module';
import { AppointmentActionController } from './appointment-action.controller';
import { AppointmentsService } from './appointments.service';
import { CompanyAppointmentsController } from './company-appointments.controller';
import { CompanyAppointmentsService } from './company-appointments.service';

describe('AppointmentsModule', () => {
  it('registers appointment action controller and appointments service', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AppointmentsModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppointmentsModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, AppointmentsModule) as unknown[];

    expect(controllers).toContain(AppointmentActionController);
    expect(controllers).toContain(CompanyAppointmentsController);
    expect(providers).toContain(AppointmentsService);
    expect(providers).toContain(CompanyAppointmentsService);
    expect(exports).toContain(AppointmentsService);
  });

  it('declares imports for typeorm feature and related modules', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppointmentsModule) as unknown[];
    expect(imports.length).toBeGreaterThan(0);
  });
});
