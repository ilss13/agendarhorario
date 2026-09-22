import { TestBed } from '@angular/core/testing';
import { WEB_ENV } from '@agendarhorario/web-data-access';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signOut } from 'firebase/auth';
import { FirebaseClientService } from './firebase-client.service';

jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: 'existing' })),
  initializeApp: jest.fn(() => ({ name: 'created' })),
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters = jest.fn();
  },
  getAuth: jest.fn(() => ({ name: 'auth' })),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(async () => undefined),
}));

const firebaseConfig = {
  apiKey: 'key',
  authDomain: 'app.firebaseapp.com',
  projectId: 'app',
};

describe('FirebaseClientService', () => {
  const setup = (firebase?: typeof firebaseConfig): FirebaseClientService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WEB_ENV,
          useValue: { apiBaseUrl: 'http://api.test/api', csrfCookieName: 'csrf', firebase },
        },
      ],
    });
    return TestBed.inject(FirebaseClientService);
  };

  it('is disabled until the client config is complete', () => {
    expect(setup(undefined).enabled).toBe(false);
    expect(setup({ ...firebaseConfig, apiKey: '' }).enabled).toBe(false);
    expect(setup(firebaseConfig).enabled).toBe(true);
  });

  it('refuses Google login when the project is missing', async () => {
    const service = setup({ ...firebaseConfig, projectId: '' });
    await expect(service.signInWithGoogle()).rejects.toThrow('não está configurado');
  });

  it('returns the id token and signs the popup session out', async () => {
    (getApps as jest.Mock).mockReturnValue([]);
    (signInWithPopup as jest.Mock).mockResolvedValue({
      user: { getIdToken: async () => 'id-token' },
    });
    const service = setup(firebaseConfig);
    await expect(service.signInWithGoogle()).resolves.toBe('id-token');
    expect(initializeApp).toHaveBeenCalled();
    expect(getAuth).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();

    (getApps as jest.Mock).mockReturnValue([{}]);
    const existing = setup(firebaseConfig);
    await existing.signInWithGoogle();
    expect(getApp).toHaveBeenCalled();
  });
});
