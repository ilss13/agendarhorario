import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { redactTelemetryUrl, shouldLogClientHttpStatus, flowFromPath } from '@agendarhorario/utils';
import type { Request } from 'express';

@Catch()
export class SentryReportingFilter extends BaseExceptionFilter {
  constructor(httpAdapterHost: HttpAdapterHost) {
    super(httpAdapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500 && Sentry.getClient()) {
      Sentry.captureException(exception);
    } else if (shouldLogClientHttpStatus(status) && Sentry.getClient()) {
      const req = host.switchToHttp().getRequest<Request | undefined>();
      const path = redactTelemetryUrl(req?.originalUrl ?? req?.url ?? '');
      Sentry.logger.warn('http.client_error', {
        status,
        method: req?.method ?? 'GET',
        path,
        flow: flowFromPath(path),
      });
    }

    super.catch(exception, host);
  }
}
