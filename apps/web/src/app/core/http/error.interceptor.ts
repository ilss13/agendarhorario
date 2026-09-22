import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import {
  flowFromPath,
  redactTelemetryUrl,
  shouldCaptureHttpStatus,
  shouldLogClientHttpStatus,
} from '@agendarhorario/utils';
import { catchError, throwError } from 'rxjs';

export interface ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  raw: unknown;
}

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const report = (status: number, error: unknown): void => {
    if (!Sentry.getClient()) return;
    const path = redactTelemetryUrl(req.url);
    const context = { status, method: req.method, path, flow: flowFromPath(path) };
    if (shouldCaptureHttpStatus(status)) {
      Sentry.captureException(error, { tags: { flow: context.flow }, extra: context });
      return;
    }
    if (shouldLogClientHttpStatus(status)) {
      Sentry.logger.warn('api.client_error', context);
    }
  };

  return next(req).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse) {
        const body = (err.error ?? {}) as {
          message?: string;
          errors?: Record<string, string[]>;
          code?: string;
        };
        const apiError: ApiError = Object.assign(new Error(body.message ?? err.message), {
          status: err.status,
          code: body.code,
          fieldErrors: body.errors,
          raw: err.error,
        });
        report(apiError.status, apiError);
        return throwError(() => apiError);
      }
      report(0, err);
      return throwError(() => err);
    }),
  );
};
