import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MyAppointmentsApi } from './me.api';
import { WEB_ENV } from './web-env.token';

describe('MyAppointmentsApi', () => {
  let api: MyAppointmentsApi;
  let http: HttpTestingController;
  const id = '11111111-1111-4111-8111-111111111111';

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
    api = TestBed.inject(MyAppointmentsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists appointments with and without filters', () => {
    api.list().subscribe();
    api.list({ range: 'past', page: 2, pageSize: 10 }).subscribe();

    http
      .expectOne('http://api.test/api/me/appointments')
      .flush({ items: [], total: 0, page: 1, pageSize: 20 });
    http
      .expectOne('http://api.test/api/me/appointments?range=past&page=2&pageSize=10')
      .flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('loads, cancels and reschedules an appointment', () => {
    api.getById(id).subscribe();
    api.cancel(id, { reason: 'imprevisto' }).subscribe();
    api.reschedule(id, { startsAt: '2026-10-03T13:00:00.000-03:00' }).subscribe();

    const get = http.expectOne(`http://api.test/api/me/appointments/${id}`);
    expect(get.request.method).toBe('GET');
    get.flush({ id });

    const cancel = http.expectOne(`http://api.test/api/me/appointments/${id}/cancel`);
    expect(cancel.request.method).toBe('PATCH');
    expect(cancel.request.body).toEqual({ reason: 'imprevisto' });
    cancel.flush({ id, status: 'CANCELLED' });

    const reschedule = http.expectOne(`http://api.test/api/me/appointments/${id}/reschedule`);
    expect(reschedule.request.body).toEqual({ startsAt: '2026-10-03T13:00:00.000-03:00' });
    reschedule.flush({ id });
  });

  it('surfaces a failed appointment lookup', () => {
    let failed = false;
    api.getById(id).subscribe({ error: () => (failed = true) });
    http
      .expectOne(`http://api.test/api/me/appointments/${id}`)
      .flush({ message: 'Não encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(failed).toBe(true);
  });
});
