import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { FirebaseAdminService } from './firebase-admin.service';

jest.mock('firebase-admin', () => {
  const cert = jest.fn((parsed: unknown) => ({ type: 'cert', parsed }));
  const auth = jest.fn(() => ({ verifyIdToken: jest.fn() }));
  const appInstance = { auth };
  return {
    apps: [] as unknown[],
    app: jest.fn(() => appInstance),
    initializeApp: jest.fn(() => appInstance),
    credential: { cert },
  };
});

jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
}));

describe('FirebaseAdminService', () => {
  const config = {
    get: jest.fn(),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    (admin.apps as unknown as unknown[]).length = 0;
  });

  it('reuses an existing firebase app when already initialized', () => {
    (admin.apps as unknown as unknown[]).push({});
    const service = new FirebaseAdminService(config);

    service.onModuleInit();

    expect(admin.app).toHaveBeenCalled();
    expect(admin.initializeApp).not.toHaveBeenCalled();
  });

  it('initializes from inline service account json', () => {
    const parsed = { client_email: 'a@b.com', private_key: 'k', project_id: 'p' };
    jest.mocked(config.get).mockImplementation((key: string) => {
      if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON') return JSON.stringify(parsed);
      return undefined;
    });
    const service = new FirebaseAdminService(config);

    service.onModuleInit();

    expect(admin.credential.cert).toHaveBeenCalledWith(parsed);
    expect(admin.initializeApp).toHaveBeenCalledWith({
      credential: expect.objectContaining({ type: 'cert' }),
    });
  });

  it('initializes from service account file path', () => {
    const parsed = { client_email: 'a@b.com', private_key: 'k', project_id: 'p' };
    jest.mocked(config.get).mockImplementation((key: string) => {
      if (key === 'FIREBASE_SERVICE_ACCOUNT_PATH') return 'sa.json';
      return undefined;
    });
    jest.mocked(readFileSync).mockReturnValue(JSON.stringify(parsed));
    const service = new FirebaseAdminService(config);

    service.onModuleInit();

    expect(readFileSync).toHaveBeenCalled();
    expect(admin.credential.cert).toHaveBeenCalledWith(parsed);
    expect(admin.initializeApp).toHaveBeenCalled();
  });

  it('throws when neither json nor path is configured', () => {
    jest.mocked(config.get).mockReturnValue(undefined);
    const service = new FirebaseAdminService(config);

    expect(() => service.onModuleInit()).toThrow('Firebase service account não configurado');
  });

  it('exposes auth from the initialized app', () => {
    (admin.apps as unknown as unknown[]).push({});
    const service = new FirebaseAdminService(config);
    service.onModuleInit();

    const auth = service.auth;

    expect(auth).toEqual(expect.objectContaining({ verifyIdToken: expect.any(Function) }));
  });
});
