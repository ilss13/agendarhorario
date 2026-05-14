import { Global, Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseIdentityToolkitClient } from './firebase-identity-toolkit.client';

@Global()
@Module({
  providers: [FirebaseAdminService, FirebaseIdentityToolkitClient],
  exports: [FirebaseAdminService, FirebaseIdentityToolkitClient],
})
export class FirebaseAdminModule {}
