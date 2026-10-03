import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActionTokenApi } from './action-token.api';
import { WEB_ENV } from './web-env.token';

describe('ActionTokenApi', () => {
  let api: ActionTokenApi;
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
    api = TestBed.inject(ActionTokenApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('previews and confirms an action token', () => {
    api.preview('a/b').subscribe();
    api.confirm('a/b', 'CANCEL').subscribe();

    const url = 'http://api.test/api/public/appointments/action/a%2Fb';
    const preview = http.expectOne((req) => req.url === url && req.method === 'GET');
    preview.flush({ kind: 'CANCEL' });

    const confirm = http.expectOne((req) => req.url === url && req.method === 'POST');
    expect(confirm.request.body).toEqual({ kind: 'CANCEL' });
    confirm.flush({ status: 'CANCELLED' });
  });

  it('surfaces a failed preview', () => {
    let failed = false;
    api.preview('expired').subscribe({ error: () => (failed = true) });
    http
      .expectOne('http://api.test/api/public/appointments/action/expired')
      .flush({ message: 'Token expirado' }, { status: 410, statusText: 'Gone' });
    expect(failed).toBe(true);
  });
});
