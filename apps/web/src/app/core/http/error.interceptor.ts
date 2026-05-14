import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
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
) =>
  next(req).pipe(
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
        return throwError(() => apiError);
      }
      return throwError(() => err);
    }),
  );
