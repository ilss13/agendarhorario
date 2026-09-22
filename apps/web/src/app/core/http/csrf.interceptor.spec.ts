import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WEB_ENV } from '@agendarhorario/web-data-access';
import { csrfInterceptor } from './csrf.interceptor';

describe('csrfInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
        {
          provide: WEB_ENV,
          useValue: { apiBaseUrl: 'http://api.test/api', csrfCookieName: 'XSRF TOKEN' },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('reads an encoded cookie and skips the header when it is absent', () => {
    document.cookie = `${encodeURIComponent('XSRF TOKEN')}=${encodeURIComponent('a=b')}`;
    http.delete('http://api.test/api/company/services/1').subscribe();
    const req = backend.expectOne('http://api.test/api/company/services/1');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('a=b');
    req.flush(null);

    document.cookie = `${encodeURIComponent('XSRF TOKEN')}=; Max-Age=0`;
    http.patch('http://api.test/api/company', {}).subscribe();
    const missing = backend.expectOne('http://api.test/api/company');
    expect(missing.request.headers.has('X-CSRF-Token')).toBe(false);
    missing.flush({});

    http.put('https://stripe.test/v1', {}).subscribe();
    const foreign = backend.expectOne('https://stripe.test/v1');
    expect(foreign.request.headers.has('X-CSRF-Token')).toBe(false);
    foreign.flush({});
  });
});
