import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { SentryReportingFilter } from './sentry-exception.filter';

jest.mock('@sentry/nestjs', () => ({
  getClient: jest.fn(),
  captureException: jest.fn(),
  logger: { warn: jest.fn() },
}));

describe('SentryReportingFilter', () => {
  const httpAdapterHost = { httpAdapter: {} } as unknown as HttpAdapterHost;
  let filter: SentryReportingFilter;
  let superCatch: jest.SpyInstance;

  const makeHost = (req?: { method?: string; url?: string; originalUrl?: string }): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new SentryReportingFilter(httpAdapterHost);
    superCatch = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    superCatch.mockRestore();
  });

  it('captures server exceptions when Sentry client is present', () => {
    jest.mocked(Sentry.getClient).mockReturnValue({} as never);
    const exception = new Error('boom');

    filter.catch(exception, makeHost({ method: 'GET', url: '/api/x' }));

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    expect(superCatch).toHaveBeenCalledWith(exception, expect.anything());
  });

  it('does not capture server exceptions when Sentry client is absent', () => {
    jest.mocked(Sentry.getClient).mockReturnValue(undefined);
    filter.catch(new Error('boom'), makeHost());

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(superCatch).toHaveBeenCalled();
  });

  it('logs client http errors for statuses that should be logged', () => {
    jest.mocked(Sentry.getClient).mockReturnValue({} as never);
    const exception = new HttpException('conflict', HttpStatus.CONFLICT);

    filter.catch(
      exception,
      makeHost({ method: 'POST', originalUrl: '/api/public/book?email=a@b.com' }),
    );

    expect(Sentry.logger.warn).toHaveBeenCalledWith(
      'http.client_error',
      expect.objectContaining({
        status: 409,
        method: 'POST',
        flow: 'booking',
      }),
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('skips client logging for statuses that should not be logged', () => {
    jest.mocked(Sentry.getClient).mockReturnValue({} as never);
    const exception = new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, makeHost({ method: 'GET', url: '/api/me' }));

    expect(Sentry.logger.warn).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('defaults method to GET when request is missing', () => {
    jest.mocked(Sentry.getClient).mockReturnValue({} as never);
    const exception = new HttpException('bad', HttpStatus.BAD_REQUEST);

    filter.catch(exception, makeHost(undefined));

    expect(Sentry.logger.warn).toHaveBeenCalledWith(
      'http.client_error',
      expect.objectContaining({
        status: 400,
        method: 'GET',
        flow: 'other',
      }),
    );
  });
});
