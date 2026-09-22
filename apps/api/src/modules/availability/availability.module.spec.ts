import { MODULE_METADATA } from '@nestjs/common/constants';
import { AvailabilityModule } from './availability.module';
import { AvailabilityService } from './availability.service';

describe('AvailabilityModule', () => {
  it('provides and exports AvailabilityService', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AvailabilityModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, AvailabilityModule) as unknown[];

    expect(providers).toContain(AvailabilityService);
    expect(exports).toContain(AvailabilityService);
  });

  it('imports TypeOrm feature entities', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AvailabilityModule) as unknown[];
    expect(imports.length).toBe(1);
  });
});
