jest.mock('firebase/app', () => ({
  getApps: () => [],
  getApp: () => ({ name: 'app' }),
  initializeApp: () => ({ name: 'app' }),
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters(): void {
      return undefined;
    }
  },
  getAuth: () => ({ name: 'auth' }),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { MeResponse } from '@agendarhorario/contracts';
import { AuthService } from '../../core/auth/auth.service';
import { FirebaseClientService } from '../../core/auth/firebase-client.service';
import { LoginPageComponent } from './login.page';

const owner: MeResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  name: 'Ana',
  role: 'OWNER',
  companyId: null,
  emailVerified: true,
  phoneVerified: false,
};

describe('LoginPageComponent', () => {
  const login = jest.fn();
  const loginWithGoogle = jest.fn();
  const signInWithGoogle = jest.fn();

  const setup = (): LoginPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login, loginWithGoogle } },
        {
          provide: FirebaseClientService,
          useValue: { enabled: true, signInWithGoogle },
        },
      ],
    });
    return TestBed.createComponent(LoginPageComponent).componentInstance;
  };

  beforeEach(() => {
    login.mockReset();
    loginWithGoogle.mockReset();
    signInWithGoogle.mockReset();
  });

  it('rejects an invalid form and shows field errors', () => {
    const page = setup();
    page.onSubmit();
    expect(login).not.toHaveBeenCalled();
    expect(page.error('email')).toBe('Campo obrigatório');
    expect(page.submitting()).toBe(false);
  });

  it('navigates after a successful login and surfaces the API error', () => {
    const page = setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.form.setValue({ email: owner.email, password: 'Senha123', rememberMe: true });

    login.mockReturnValue(of(owner));
    page.onSubmit();
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(page.submitting()).toBe(false);

    login.mockReturnValue(throwError(() => ({})));
    page.onSubmit();
    expect(page.serverError()).toBe('Não foi possível entrar');
    expect(page.busy()).toBe(false);
  });

  it('maps each Google failure and completes a successful popup login', async () => {
    const page = setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const codes: Array<[string, string]> = [
      ['auth/popup-closed-by-user', 'cancelado'],
      ['auth/cancelled-popup-request', 'cancelado'],
      ['auth/account-exists-with-different-credential', 'senha'],
      ['auth/unauthorized-domain', 'domínio'],
      ['auth/operation-not-allowed', 'habilitado'],
    ];
    for (const [code, snippet] of codes) {
      signInWithGoogle.mockRejectedValue({ code });
      page.onGoogle();
      await Promise.resolve();
      expect(page.serverError()).toContain(snippet);
    }

    signInWithGoogle.mockRejectedValue({ message: 'rede' });
    page.onGoogle();
    await Promise.resolve();
    expect(page.serverError()).toBe('rede');

    signInWithGoogle.mockRejectedValue({});
    page.onGoogle();
    await Promise.resolve();
    expect(page.serverError()).toBe('Não foi possível entrar com o Google.');

    signInWithGoogle.mockResolvedValue('id-token');
    loginWithGoogle.mockReturnValue(of({ ...owner, role: 'CUSTOMER' as const }));
    page.onGoogle();
    await Promise.resolve();
    expect(loginWithGoogle).toHaveBeenCalledWith({ idToken: 'id-token', rememberMe: true });
    expect(navigate).toHaveBeenCalledWith(['/me/agendamentos']);
    expect(page.googleEnabled).toBe(true);
  });
});
