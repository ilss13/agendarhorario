import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { WEB_ENV } from '@agendarhorario/web-data-access';

export const credentialsInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const env = inject(WEB_ENV);
  if (req.url.startsWith(env.apiBaseUrl)) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
};
