import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { FirebaseAdminService } from '../../shared/infra/firebase/firebase-admin.service';
import { User } from '../users/user.entity';
import { AuthGuard, IS_PUBLIC_KEY, Public } from './auth.guard';
import type { AuthenticatedRequest } from './auth.types';

describe('AuthGuard', () => {
  const getAllAndOverride = jest.fn();
  const verifySessionCookie = jest.fn();
  const findOne = jest.fn();
  const configGet = jest.fn();

  const reflector = { getAllAndOverride } as unknown as Reflector;
  const firebase = {
    auth: { verifySessionCookie },
  } as unknown as FirebaseAdminService;
  const config = { get: configGet } as unknown as ConfigService;
  const users = { findOne } as unknown as Repository<User>;
  let guard: AuthGuard;

  const makeCtx = (req: Partial<AuthenticatedRequest>): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    getAllAndOverride.mockReset();
    verifySessionCookie.mockReset();
    findOne.mockReset();
    configGet.mockReset();
    configGet.mockReturnValue('__session');
    guard = new AuthGuard(reflector, firebase, config, users);
  });

  it('exports Public metadata key', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
    const decorator = Public();
    expect(typeof decorator).toBe('function');
  });

  it('allows public routes without a session', async () => {
    getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(makeCtx({}))).resolves.toBe(true);
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when session cookie is missing', async () => {
    getAllAndOverride.mockReturnValue(false);
    await expect(guard.canActivate(makeCtx({ cookies: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when session cookie is invalid', async () => {
    getAllAndOverride.mockReturnValue(false);
    verifySessionCookie.mockRejectedValue(new Error('bad cookie'));
    await expect(guard.canActivate(makeCtx({ cookies: { __session: 'bad' } }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when user is not found', async () => {
    getAllAndOverride.mockReturnValue(false);
    verifySessionCookie.mockResolvedValue({ uid: 'fb-missing' });
    findOne.mockResolvedValue(null);

    await expect(guard.canActivate(makeCtx({ cookies: { __session: 'ok' } }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches authenticated user and returns true', async () => {
    getAllAndOverride.mockReturnValue(false);
    verifySessionCookie.mockResolvedValue({ uid: 'fb-1' });
    findOne.mockResolvedValue({
      id: 'u1',
      firebaseUid: 'fb-1',
      email: 'a@b.com',
      name: 'Ana',
      phone: null,
      role: 'OWNER',
      companyId: 'c1',
      emailVerified: true,
      phoneVerified: false,
    });
    const req: Partial<AuthenticatedRequest> = { cookies: { __session: 'ok' } };

    await expect(guard.canActivate(makeCtx(req))).resolves.toBe(true);
    expect(req.user).toEqual({
      id: 'u1',
      firebaseUid: 'fb-1',
      email: 'a@b.com',
      name: 'Ana',
      phone: null,
      role: 'OWNER',
      companyId: 'c1',
      emailVerified: true,
      phoneVerified: false,
    });
  });

  it('falls back to __session when cookie name is unset', async () => {
    configGet.mockReturnValue(undefined);
    getAllAndOverride.mockReturnValue(false);
    verifySessionCookie.mockResolvedValue({ uid: 'fb-1' });
    findOne.mockResolvedValue({
      id: 'u1',
      firebaseUid: 'fb-1',
      email: 'a@b.com',
      name: 'Ana',
      phone: null,
      role: 'CUSTOMER',
      companyId: null,
      emailVerified: false,
      phoneVerified: false,
    });

    await expect(guard.canActivate(makeCtx({ cookies: { __session: 'tok' } }))).resolves.toBe(true);
  });
});
