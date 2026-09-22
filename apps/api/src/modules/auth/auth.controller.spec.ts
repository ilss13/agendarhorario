import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GoogleLoginRequest,
  LoginRequest,
  MeResponse,
  RegisterCompanyRequest,
  RegisterCustomerRequest,
} from '@agendarhorario/contracts';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService, SessionResult } from './auth.service';
import type { AuthenticatedUser } from './auth.types';

describe('AuthController', () => {
  const registerCompany = jest.fn();
  const registerCustomer = jest.fn();
  const login = jest.fn();
  const loginWithGoogle = jest.fn();
  const logout = jest.fn();
  const me = jest.fn();
  const configGet = jest.fn();

  const authService = {
    registerCompany,
    registerCustomer,
    login,
    loginWithGoogle,
    logout,
    me,
  } as unknown as AuthService;
  const config = { get: configGet } as unknown as ConfigService;
  const controller = new AuthController(authService, config);

  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const res = { cookie, clearCookie } as unknown as Response;

  const session: SessionResult = { sessionCookie: 'sess', expiresInMs: 86_400_000 };
  const meResponse = {
    id: 'u1',
    email: 'a@b.com',
    name: 'Ana',
    role: 'OWNER',
    companyId: 'c1',
    emailVerified: false,
    phoneVerified: false,
  } as MeResponse;

  beforeEach(() => {
    registerCompany.mockReset();
    registerCustomer.mockReset();
    login.mockReset();
    loginWithGoogle.mockReset();
    logout.mockReset();
    me.mockReset();
    configGet.mockReset();
    cookie.mockReset();
    clearCookie.mockReset();
    configGet.mockImplementation((key: string) => {
      if (key === 'SESSION_COOKIE_NAME') return '__session';
      if (key === 'SESSION_COOKIE_SECURE') return false;
      if (key === 'SESSION_COOKIE_DOMAIN') return undefined;
      return undefined;
    });
  });

  it('registers a company and sets the session cookie', async () => {
    registerCompany.mockResolvedValue({ session, me: meResponse });
    const input = { company: { name: 'X', slug: 'x' }, owner: {} } as RegisterCompanyRequest;

    await expect(controller.registerCompany(input, res)).resolves.toEqual(meResponse);
    expect(cookie).toHaveBeenCalledWith(
      '__session',
      'sess',
      expect.objectContaining({ httpOnly: true, maxAge: 86_400_000, sameSite: 'lax' }),
    );
  });

  it('propagates ConflictException from registerCompany', async () => {
    registerCompany.mockRejectedValue(new ConflictException('Slug já está em uso'));
    await expect(controller.registerCompany({} as RegisterCompanyRequest, res)).rejects.toThrow(
      ConflictException,
    );
  });

  it('registers a customer and sets the session cookie', async () => {
    registerCustomer.mockResolvedValue({ session, me: meResponse });
    await expect(controller.registerCustomer({} as RegisterCustomerRequest, res)).resolves.toEqual(
      meResponse,
    );
    expect(cookie).toHaveBeenCalled();
  });

  it('logs in and sets the session cookie', async () => {
    login.mockResolvedValue({ session, me: meResponse });
    await expect(controller.login({} as LoginRequest, res)).resolves.toEqual(meResponse);
    expect(login).toHaveBeenCalled();
  });

  it('logs in with Google and sets the session cookie', async () => {
    loginWithGoogle.mockResolvedValue({ session, me: meResponse });
    await expect(controller.loginGoogle({} as GoogleLoginRequest, res)).resolves.toEqual(
      meResponse,
    );
  });

  it('propagates UnauthorizedException from login', async () => {
    login.mockRejectedValue(new UnauthorizedException('Usuário não encontrado'));
    await expect(controller.login({} as LoginRequest, res)).rejects.toThrow(UnauthorizedException);
  });

  it('logs out and clears the session cookie', async () => {
    logout.mockResolvedValue(undefined);
    const req = { cookies: { __session: 'sess' } } as unknown as Request;

    await expect(controller.logout(req, res)).resolves.toBeUndefined();
    expect(logout).toHaveBeenCalledWith('sess');
    expect(clearCookie).toHaveBeenCalledWith('__session', expect.objectContaining({ path: '/' }));
  });

  it('returns me from the authenticated user', () => {
    const user = { id: 'u1' } as AuthenticatedUser;
    me.mockReturnValue(meResponse);
    expect(controller.me(user)).toEqual(meResponse);
    expect(me).toHaveBeenCalledWith(user);
  });

  it('falls back to default cookie name when unset', async () => {
    configGet.mockReturnValue(undefined);
    login.mockResolvedValue({ session, me: meResponse });
    await controller.login({} as LoginRequest, res);
    expect(cookie).toHaveBeenCalledWith('__session', 'sess', expect.any(Object));
  });
});
