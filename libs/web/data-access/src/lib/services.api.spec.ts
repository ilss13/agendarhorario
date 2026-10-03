import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ServicesApi } from './services.api';
import { WEB_ENV } from './web-env.token';

describe('ServicesApi', () => {
  let api: ServicesApi;
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
    api = TestBed.inject(ServicesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists services without query params', () => {
    api.list().subscribe();
    const req = http.expectOne('http://api.test/api/company/services');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('builds list URL with query params', () => {
    api.list({ page: 2, pageSize: 10, q: 'corte' }).subscribe();
    const req = http.expectOne('http://api.test/api/company/services?page=2&pageSize=10&q=corte');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('gets, creates, updates and removes a service', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const body = {
      name: 'Corte',
      durationMinutes: 30,
      bufferMinutes: 0,
      price: 40,
      active: true,
    };
    api.get(id).subscribe();
    api.create(body).subscribe();
    api.update(id, { name: 'Corte curto' }).subscribe();
    api.remove(id).subscribe();

    const get = http.expectOne(
      (req) => req.url === `http://api.test/api/company/services/${id}` && req.method === 'GET',
    );
    get.flush({ id, ...body });

    const create = http.expectOne(
      (req) => req.url === 'http://api.test/api/company/services' && req.method === 'POST',
    );
    expect(create.request.body).toEqual(body);
    create.flush({ id, ...body });

    const update = http.expectOne(
      (req) => req.url === `http://api.test/api/company/services/${id}` && req.method === 'PATCH',
    );
    update.flush({ id, name: 'Corte curto' });

    const remove = http.expectOne(
      (req) => req.url === `http://api.test/api/company/services/${id}` && req.method === 'DELETE',
    );
    remove.flush(null);
  });

  it('surfaces a failed service lookup', () => {
    let failed = false;
    api.get('missing').subscribe({ error: () => (failed = true) });
    http
      .expectOne('http://api.test/api/company/services/missing')
      .flush({ message: 'Não encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(failed).toBe(true);
  });
});
