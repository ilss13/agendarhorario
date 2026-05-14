import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app!: admin.app.App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (admin.apps.length > 0) {
      this.app = admin.app();
      return;
    }
    const credential = this.resolveCredential();
    this.app = admin.initializeApp({ credential });
    this.logger.log('Firebase Admin inicializado');
  }

  get auth(): admin.auth.Auth {
    return this.app.auth();
  }

  private resolveCredential(): admin.credential.Credential {
    const jsonInline = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (jsonInline) {
      const parsed = JSON.parse(jsonInline);
      return admin.credential.cert(parsed);
    }
    const path = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    if (!path) {
      throw new Error('Firebase service account não configurado');
    }
    const absolute = resolve(process.cwd(), path);
    const parsed = JSON.parse(readFileSync(absolute, 'utf-8'));
    return admin.credential.cert(parsed);
  }
}
