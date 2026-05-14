import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * CSRF via double-submit cookie:
 *  - Token aleatório é setado em cookie XSRF-TOKEN (não-HttpOnly, lido pelo front)
 *  - Em mutations (POST/PUT/PATCH/DELETE) exigimos header X-CSRF-Token igual ao cookie
 *  - Comparação timing-safe
 *
 * Endpoints públicos (sem cookie de sessão) são liberados — sem sessão não há CSRF.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly cookieName: string;
  private readonly sessionCookieName: string;

  constructor(private readonly config: ConfigService) {
    this.cookieName = config.get<string>('CSRF_COOKIE_NAME') ?? 'XSRF-TOKEN';
    this.sessionCookieName = config.get<string>('SESSION_COOKIE_NAME') ?? '__session';
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const isSafe = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const hasSession = !!req.cookies?.[this.sessionCookieName];

    if (!req.cookies?.[this.cookieName]) {
      const token = randomBytes(32).toString('base64url');
      res.cookie(this.cookieName, token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: this.config.get<boolean>('SESSION_COOKIE_SECURE') === true,
        path: '/',
      });
    }

    if (isSafe || !hasSession) {
      next();
      return;
    }

    const cookieToken = req.cookies[this.cookieName];
    const headerToken = req.header('x-csrf-token');
    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
      throw new ForbiddenException('CSRF token inválido');
    }
    next();
  }
}

const safeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};
