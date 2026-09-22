import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { FirebaseAdminModule } from './firebase-admin.module';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseIdentityToolkitClient } from './firebase-identity-toolkit.client';

describe('FirebaseAdminModule', () => {
  it('is marked as a global module', () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, FirebaseAdminModule)).toBe(true);
  });

  it('registers firebase admin providers', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, FirebaseAdminModule)).toEqual([
      FirebaseAdminService,
      FirebaseIdentityToolkitClient,
    ]);
  });

  it('exports firebase admin providers', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, FirebaseAdminModule)).toEqual([
      FirebaseAdminService,
      FirebaseIdentityToolkitClient,
    ]);
  });
});
