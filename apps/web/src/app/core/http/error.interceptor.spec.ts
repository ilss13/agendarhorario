jest.mock('@sentry/angular', () => ({
  getClient: jest.fn(),
  captureException: jest.fn(),
  logger: { warn: jest.fn() },
}));

import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('maps an HTTP error and captures server failures', () => {
    (Sentry.getClient as jest.Mock).mockReturnValue({});
    const capture = Sentry.captureException as jest.Mock;
    let caught:
      | { status: number; code?: string; fieldErrors?: Record<string, string[]>; message: string }
      | undefined;
    http.get('/api/company').subscribe({ error: (err) => (caught = err) });
    backend
      .expectOne('/api/company')
      .flush(
        { message: 'Falhou', code: 'boom', errors: { slug: ['em uso'] } },
        { status: 500, statusText: 'Error' },
      );
    expect(caught?.status).toBe(500);
    expect(caught?.code).toBe('boom');
    expect(caught?.fieldErrors).toEqual({ slug: ['em uso'] });
    expect(caught?.message).toBe('Falhou');
    expect(capture).toHaveBeenCalled();
  });

  it('logs client errors and falls back to the status text', () => {
    (Sentry.getClient as jest.Mock).mockReturnValue({});
    const warn = Sentry.logger.warn as jest.Mock;
    let caught: { message: string } | undefined;
    http.get('/api/company').subscribe({ error: (err) => (caught = err) });
    backend.expectOne('/api/company').flush(null, { status: 409, statusText: 'Conflict' });
    expect(caught?.message).toBe('Http failure response for /api/company: 409 Conflict');
    expect(warn).toHaveBeenCalledWith('api.client_error', expect.objectContaining({ status: 409 }));
  });

  it('ignores reporting when Sentry is off and rethrows non-HTTP errors', () => {
    (Sentry.getClient as jest.Mock).mockReturnValue(undefined);
    const capture = Sentry.captureException as jest.Mock;
    capture.mockClear();
    let status = 0;
    http.get('/api/ok').subscribe({ error: (err) => (status = err.status) });
    backend.expectOne('/api/ok').flush({}, { status: 404, statusText: 'Not found' });
    expect(status).toBe(404);
    expect(capture).not.toHaveBeenCalled();

    const req = http.get('/api/plain');
    const error = new Error('socket');
    let received: unknown;
    req.subscribe({ error: (err) => (received = err) });
    backend.expectOne('/api/plain').error(new ProgressEvent('error'));
    expect(received).toBeInstanceOf(Error);
    expect(received).not.toBeInstanceOf(HttpErrorResponse);
  });
});
