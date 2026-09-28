import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CompanyAppointmentsApi } from './company-appointments.api';
import { WEB_ENV } from './web-env.token';

describe('CompanyAppointmentsApi', () => {
  let api: CompanyAppointmentsApi;
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
    api = TestBed.inject(CompanyAppointmentsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the company agenda for a date', () => {
    api.list('2026-09-23').subscribe();
    const req = http.expectOne('http://api.test/api/company/appointments?date=2026-09-23');
    expect(req.request.method).toBe('GET');
    req.flush({ date: '2026-09-23', items: [] });
  });

  it('surfaces a failed agenda request', () => {
    let failed = false;
    api.list('2026-02-31').subscribe({ error: () => (failed = true) });
    const req = http.expectOne('http://api.test/api/company/appointments?date=2026-02-31');
    req.flush({ message: 'Data inválida' }, { status: 400, statusText: 'Bad Request' });
    expect(failed).toBe(true);
  });
});
