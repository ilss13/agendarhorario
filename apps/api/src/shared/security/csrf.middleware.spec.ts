import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { CsrfMiddleware } from './csrf.middleware';

describe('CsrfMiddleware', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'CSRF_COOKIE_NAME') return 'XSRF-TOKEN';
      if (key === 'SESSION_COOKIE_NAME') return '__session';
      if (key === 'SESSION_COOKIE_SECURE') return false;
      return undefined;
    }),
  } as unknown as ConfigService;

  const middleware = new CsrfMiddleware(config);

  const makeRes = (): Response =>
    ({
      cookie: jest.fn(),
    }) as unknown as Response;

  const makeReq = (partial: {
    method: string;
    cookies?: Record<string, string>;
    header?: (name: string) => string | undefined;
  }): Request =>
    ({
      method: partial.method,
      cookies: partial.cookies ?? {},
      header: partial.header ?? (() => undefined),
    }) as unknown as Request;

  it('sets csrf cookie when missing and allows safe methods', () => {
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'lax', path: '/' }),
    );
    expect(next).toHaveBeenCalled();
  });

  it('allows mutations without session cookie', () => {
    const req = makeReq({
      method: 'POST',
      cookies: { 'XSRF-TOKEN': 'abc' },
    });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows mutation when session and csrf header match cookie', () => {
    const token = 'same-token-value-123456789012';
    const req = makeReq({
      method: 'POST',
      cookies: { __session: 'sid', 'XSRF-TOKEN': token },
      header: (name) => (name === 'x-csrf-token' ? token : undefined),
    });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('throws ForbiddenException when csrf header mismatches cookie', () => {
    const req = makeReq({
      method: 'DELETE',
      cookies: { __session: 'sid', 'XSRF-TOKEN': 'cookie-token' },
      header: (name) => (name === 'x-csrf-token' ? 'header-token' : undefined),
    });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    expect(() => middleware.use(req, res, next)).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when csrf header is missing for mutation with session', () => {
    const req = makeReq({
      method: 'PUT',
      cookies: { __session: 'sid', 'XSRF-TOKEN': 'cookie-token' },
    });
    const res = makeRes();

    expect(() => middleware.use(req, res, jest.fn())).toThrow(ForbiddenException);
  });

  it('does not set cookie again when csrf cookie already exists', () => {
    const req = makeReq({
      method: 'HEAD',
      cookies: { 'XSRF-TOKEN': 'existing' },
    });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    middleware.use(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('uses default cookie names when config values are absent', () => {
    const looseConfig = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const mw = new CsrfMiddleware(looseConfig);
    const req = makeReq({ method: 'OPTIONS' });
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    mw.use(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ secure: false }),
    );
    expect(next).toHaveBeenCalled();
  });
});
