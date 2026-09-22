import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CompanyScoped } from './company-scoped.decorator';
import { ROLES_KEY, RolesGuard } from './roles.guard';

describe('CompanyScoped', () => {
  it('sets OWNER and STAFF roles metadata on the class', () => {
    @CompanyScoped()
    class SampleController {}

    expect(Reflect.getMetadata(ROLES_KEY, SampleController)).toEqual(['OWNER', 'STAFF']);
  });

  it('registers RolesGuard via UseGuards metadata', () => {
    @CompanyScoped()
    class SampleController {}

    expect(Reflect.getMetadata(GUARDS_METADATA, SampleController)).toEqual([RolesGuard]);
  });
});
