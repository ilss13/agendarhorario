import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BillingApi } from './billing.api';
import { WEB_ENV } from './web-env.token';

describe('BillingApi', () => {
  let api: BillingApi;
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
    api = TestBed.inject(BillingApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads plans, the subscription and invoices', () => {
    api.plans().subscribe();
    api.subscription().subscribe();
    api.invoices().subscribe();

    expect(http.expectOne('http://api.test/api/billing/plans').request.method).toBe('GET');
    expect(http.expectOne('http://api.test/api/company/billing/subscription').request.method).toBe(
      'GET',
    );
    expect(http.expectOne('http://api.test/api/company/billing/invoices').request.method).toBe(
      'GET',
    );
    http.match(() => true).forEach((req) => req.flush([]));
  });

  it('starts checkout, the portal, a plan change, confirmation and cancellation', () => {
    api.checkout({ planCode: 'basico' }).subscribe();
    api.portal().subscribe();
    api.changePlan({ planCode: 'medio' }).subscribe();
    api.confirmCheckout().subscribe();
    api.confirmCheckout({ sessionId: 'cs_1' }).subscribe();
    api.cancel().subscribe();

    const checkout = http.expectOne('http://api.test/api/company/billing/checkout-session');
    expect(checkout.request.body).toEqual({ planCode: 'basico' });
    checkout.flush({ url: 'https://pay.example/cs' });

    const portal = http.expectOne('http://api.test/api/company/billing/portal-session');
    expect(portal.request.body).toEqual({});
    portal.flush({ url: 'https://pay.example/portal' });

    const change = http.expectOne('http://api.test/api/company/billing/change-plan');
    expect(change.request.body).toEqual({ planCode: 'medio' });
    change.flush({});

    const confirmUrl = 'http://api.test/api/company/billing/confirm-checkout';
    const confirms = http.match(confirmUrl);
    expect(confirms.map((req) => req.request.body)).toEqual([{}, { sessionId: 'cs_1' }]);
    confirms.forEach((req) => req.flush({}));

    const cancel = http.expectOne('http://api.test/api/company/billing/cancel');
    expect(cancel.request.method).toBe('POST');
    cancel.flush({});
  });

  it('surfaces a failed checkout', () => {
    let failed = false;
    api.checkout({ planCode: 'basico' }).subscribe({ error: () => (failed = true) });
    http
      .expectOne('http://api.test/api/company/billing/checkout-session')
      .flush({ message: 'Plano indisponível' }, { status: 400, statusText: 'Bad Request' });
    expect(failed).toBe(true);
  });
});
