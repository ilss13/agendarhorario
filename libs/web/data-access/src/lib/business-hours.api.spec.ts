import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BusinessExceptionsApi, BusinessHoursApi } from './business-hours.api';
import { WEB_ENV } from './web-env.token';

describe('BusinessHoursApi', () => {
  let hours: BusinessHoursApi;
  let exceptions: BusinessExceptionsApi;
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
    hours = TestBed.inject(BusinessHoursApi);
    exceptions = TestBed.inject(BusinessExceptionsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists and replaces business hours', () => {
    const input = { hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }] };
    hours.list().subscribe();
    hours.replace(input).subscribe();

    const list = http.expectOne(
      (req) => req.url === 'http://api.test/api/company/business-hours' && req.method === 'GET',
    );
    list.flush([]);

    const replace = http.expectOne(
      (req) => req.url === 'http://api.test/api/company/business-hours' && req.method === 'PUT',
    );
    expect(replace.request.body).toEqual(input);
    replace.flush([]);
  });

  it('lists exceptions with and without a date range', () => {
    exceptions.list().subscribe();
    exceptions.list({ from: '2026-10-01', to: '2026-10-31' }).subscribe();

    http.expectOne('http://api.test/api/company/business-exceptions').flush([]);
    http
      .expectOne('http://api.test/api/company/business-exceptions?from=2026-10-01&to=2026-10-31')
      .flush([]);
  });

  it('creates and removes an exception', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    exceptions.create({ date: '2026-10-02', fullDay: true }).subscribe();
    exceptions.remove(id).subscribe();

    const create = http.expectOne('http://api.test/api/company/business-exceptions');
    expect(create.request.method).toBe('POST');
    create.flush({ id });

    const remove = http.expectOne(`http://api.test/api/company/business-exceptions/${id}`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('surfaces a failed hours request', () => {
    let failed = false;
    hours.list().subscribe({ error: () => (failed = true) });
    http
      .expectOne('http://api.test/api/company/business-hours')
      .flush({ message: 'Indisponível' }, { status: 500, statusText: 'Server Error' });
    expect(failed).toBe(true);
  });
});
