import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CompaniesApi } from './companies.api';
import { WEB_ENV } from './web-env.token';

describe('CompaniesApi', () => {
  let api: CompaniesApi;
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
    api = TestBed.inject(CompaniesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads and updates the company', () => {
    api.get().subscribe();
    api.update({ name: 'Salao' }).subscribe();

    const get = http.expectOne(
      (req) => req.url === 'http://api.test/api/company' && req.method === 'GET',
    );
    get.flush({ name: 'Salao' });

    const update = http.expectOne(
      (req) => req.url === 'http://api.test/api/company' && req.method === 'PATCH',
    );
    expect(update.request.body).toEqual({ name: 'Salao' });
    update.flush({ name: 'Salao' });
  });

  it('surfaces a failed company update', () => {
    let failed = false;
    api.update({}).subscribe({ error: () => (failed = true) });
    http
      .expectOne('http://api.test/api/company')
      .flush({ message: 'Nada para atualizar' }, { status: 400, statusText: 'Bad Request' });
    expect(failed).toBe(true);
  });
});
