import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WEB_ENV } from '@agendarhorario/web-data-access';
import type { MeResponse } from '@agendarhorario/contracts';
import { AuthService } from './auth.service';

const me: MeResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  name: 'Ana',
  role: 'OWNER',
  companyId: '22222222-2222-4222-8222-222222222222',
  emailVerified: true,
  phoneVerified: false,
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: WEB_ENV,
          useValue: { apiBaseUrl: 'http://api.test/api', csrfCookieName: 'XSRF-TOKEN' },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the session from /auth/me and ignores a missing session', () => {
    let value: MeResponse | null | undefined;
    auth.initialize().subscribe((result) => (value = result));
    http.expectOne('http://api.test/api/auth/me').flush(me);
    expect(value).toEqual(me);
    expect(auth.user()).toEqual(me);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.initialized()).toBe(true);

    auth.initialize().subscribe((result) => (value = result));
    http
      .expectOne('http://api.test/api/auth/me')
      .flush('nope', { status: 401, statusText: 'Unauthorized' });
    expect(value).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('logs in with a password and clears the loading flag', () => {
    auth.login({ email: me.email, password: 'Senha123' }).subscribe();
    expect(auth.loading()).toBe(true);
    http.expectOne('http://api.test/api/auth/login').flush(me);
    expect(auth.user()).toEqual(me);
    expect(auth.loading()).toBe(false);
  });

  it('logs in with Google, registers a company and a customer', () => {
    auth.loginWithGoogle({ idToken: 'a'.repeat(20), rememberMe: true }).subscribe();
    http.expectOne('http://api.test/api/auth/login/google').flush({ ...me, role: 'CUSTOMER' });
    expect(auth.user()?.role).toBe('CUSTOMER');

    auth
      .registerCompany({
        company: { name: 'Salao', slug: 'salao' },
        owner: { name: 'Ana', email: me.email, password: 'Senha123' },
      })
      .subscribe();
    http.expectOne('http://api.test/api/auth/register-company').flush(me);

    auth.registerCustomer({ name: 'Ana', email: me.email, password: 'Senha123' }).subscribe();
    http.expectOne('http://api.test/api/auth/register-customer').flush(me);
    expect(auth.loading()).toBe(false);
  });

  it('clears the user on logout, including when the request fails', () => {
    auth.login({ email: me.email, password: 'Senha123' }).subscribe();
    http.expectOne('http://api.test/api/auth/login').flush(me);

    auth.logout().subscribe();
    http.expectOne('http://api.test/api/auth/logout').flush(null);
    expect(auth.user()).toBeNull();

    auth.login({ email: me.email, password: 'Senha123' }).subscribe();
    http.expectOne('http://api.test/api/auth/login').flush(me);
    let failed = false;
    auth.logout().subscribe({ error: () => (failed = true) });
    http
      .expectOne('http://api.test/api/auth/logout')
      .flush('no', { status: 500, statusText: 'Error' });
    expect(failed).toBe(true);
    expect(auth.user()).toBeNull();
  });
});
