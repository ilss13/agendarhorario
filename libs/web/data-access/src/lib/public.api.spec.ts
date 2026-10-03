import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PublicCompaniesApi, PublicVerificationApi } from './public.api';
import { WEB_ENV } from './web-env.token';

describe('PublicCompaniesApi', () => {
  let companies: PublicCompaniesApi;
  let verification: PublicVerificationApi;
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
    companies = TestBed.inject(PublicCompaniesApi);
    verification = TestBed.inject(PublicVerificationApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a company and availability with and without an end date', () => {
    companies.getBySlug('salao').subscribe();
    companies.availability('salao', 'svc-1', '2026-10-02').subscribe();
    companies.availability('salao', 'svc-1', '2026-10-02', '2026-10-09').subscribe();

    http.expectOne('http://api.test/api/public/companies/salao').flush({ slug: 'salao' });
    http
      .expectOne(
        'http://api.test/api/public/companies/salao/availability?serviceId=svc-1&from=2026-10-02',
      )
      .flush({ days: [] });
    http
      .expectOne(
        'http://api.test/api/public/companies/salao/availability?serviceId=svc-1&from=2026-10-02&to=2026-10-09',
      )
      .flush({ days: [] });
  });

  it('creates an appointment and requests or confirms verification', () => {
    const booking = {
      serviceId: 'svc-1',
      startsAt: '2026-10-02T13:00:00.000-03:00',
      customer: { name: 'Ana', email: 'ana@studio.com', phone: '+5511999999999' },
    };
    companies.createAppointment('salao', booking).subscribe();
    verification.request({ email: 'ana@studio.com', phone: '+5511999999999' }).subscribe();
    verification
      .confirm({ channel: 'EMAIL', target: 'ana@studio.com', code: '123456' })
      .subscribe();

    const created = http.expectOne('http://api.test/api/public/companies/salao/appointments');
    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual(booking);
    created.flush({ id: 'appt-1' });

    const requested = http.expectOne('http://api.test/api/public/verification/request');
    expect(requested.request.method).toBe('POST');
    requested.flush({ channel: 'EMAIL', target: 'ana@studio.com' });

    const confirmed = http.expectOne('http://api.test/api/public/verification/confirm');
    expect(confirmed.request.body).toEqual({
      channel: 'EMAIL',
      target: 'ana@studio.com',
      code: '123456',
    });
    confirmed.flush({ verificationToken: 'token' });
  });

  it('surfaces a missing public company', () => {
    let failed = false;
    companies.getBySlug('ausente').subscribe({ error: () => (failed = true) });
    http
      .expectOne('http://api.test/api/public/companies/ausente')
      .flush({ message: 'Não encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(failed).toBe(true);
  });
});
