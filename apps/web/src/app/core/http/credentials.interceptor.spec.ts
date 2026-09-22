import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WEB_ENV } from '@agendarhorario/web-data-access';
import { credentialsInterceptor } from './credentials.interceptor';
import { csrfInterceptor } from './csrf.interceptor';

describe('HTTP interceptors', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, csrfInterceptor])),
        provideHttpClientTesting(),
        {
          provide: WEB_ENV,
          useValue: { apiBaseUrl: 'http://api.test/api', csrfCookieName: 'XSRF-TOKEN' },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    document.cookie = 'XSRF-TOKEN=tok%3Den';
  });

  afterEach(() => {
    backend.verify();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0';
  });

  it('attaches credentials and the CSRF token on unsafe API calls', () => {
    http.post('http://api.test/api/auth/login', {}).subscribe();
    const req = backend.expectOne('http://api.test/api/auth/login');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('tok=en');
    req.flush({});
  });

  it('leaves safe calls and foreign hosts untouched', () => {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0';
    http.get('http://api.test/api/auth/me').subscribe();
    const safe = backend.expectOne('http://api.test/api/auth/me');
    expect(safe.request.withCredentials).toBe(true);
    expect(safe.request.headers.has('X-CSRF-Token')).toBe(false);
    safe.flush({});

    http.post('http://other.test/x', {}).subscribe();
    const foreign = backend.expectOne('http://other.test/x');
    expect(foreign.request.withCredentials).toBe(false);
    foreign.flush({});

    http.post('http://api.test/api/auth/logout', {}).subscribe();
    const missing = backend.expectOne('http://api.test/api/auth/logout');
    expect(missing.request.headers.has('X-CSRF-Token')).toBe(false);
    missing.flush({});
  });
});
