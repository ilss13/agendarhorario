import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { WEB_ENV } from '@agendarhorario/web-data-access';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const env = inject(WEB_ENV);
  if (!req.url.startsWith(env.apiBaseUrl) || !UNSAFE_METHODS.has(req.method)) {
    return next(req);
  }
  const token = readCookie(env.csrfCookieName);
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { 'X-CSRF-Token': token } }));
};

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${encodeURIComponent(name)}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
};
