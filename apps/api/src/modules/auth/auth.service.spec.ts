import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import type {
  GoogleLoginRequest,
  LoginRequest,
  RegisterCompanyRequest,
  RegisterCustomerRequest,
} from '@agendarhorario/contracts';
import { FirebaseAdminService } from '../../shared/infra/firebase/firebase-admin.service';
import { FirebaseIdentityToolkitClient } from '../../shared/infra/firebase/firebase-identity-toolkit.client';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';

describe('AuthService', () => {
  const signInWithPassword = jest.fn();
  const signUpWithPassword = jest.fn();
  const verifyIdToken = jest.fn();
  const createSessionCookie = jest.fn();
  const setCustomUserClaims = jest.fn();
  const verifySessionCookie = jest.fn();
  const revokeRefreshTokens = jest.fn();
  const deleteUser = jest.fn();
  const usersFindOne = jest.fn();
  const usersSave = jest.fn();
  const usersCreate = jest.fn();
  const companiesFindOne = jest.fn();
  const transaction = jest.fn();
  const configGet = jest.fn();

  const firebase = {
    auth: {
      verifyIdToken,
      createSessionCookie,
      setCustomUserClaims,
      verifySessionCookie,
      revokeRefreshTokens,
      deleteUser,
    },
  } as unknown as FirebaseAdminService;
  const identity = {
    signInWithPassword,
    signUpWithPassword,
  } as unknown as FirebaseIdentityToolkitClient;
  const config = { get: configGet } as unknown as ConfigService;
  const dataSource = { transaction } as unknown as DataSource;
  const users = {
    findOne: usersFindOne,
    save: usersSave,
    create: usersCreate,
  } as unknown as Repository<User>;
  const companies = { findOne: companiesFindOne } as unknown as Repository<Company>;

  let service: AuthService;

  const baseUser = (): User => {
    const user = new User();
    user.id = 'u1';
    user.firebaseUid = 'fb-1';
    user.email = 'owner@ex.com';
    user.name = 'Owner';
    user.phone = null;
    user.role = 'OWNER';
    user.emailVerified = false;
    user.phoneVerified = false;
    user.companyId = 'c1';
    return user;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configGet.mockImplementation((key: string, defaultValue?: number) => {
      if (key === 'SESSION_COOKIE_MAX_AGE_DAYS') return defaultValue ?? 5;
      return undefined;
    });
    createSessionCookie.mockResolvedValue('session-cookie');
    usersCreate.mockImplementation((row: Partial<User>) => row);
    usersSave.mockImplementation(async (row: User) => row);
    service = new AuthService(firebase, identity, config, dataSource, users, companies);
  });

  describe('login', () => {
    it('returns session and me for an existing user', async () => {
      signInWithPassword.mockResolvedValue({ idToken: 'id-tok' });
      verifyIdToken.mockResolvedValue({ uid: 'fb-1' });
      usersFindOne.mockResolvedValue(baseUser());

      const result = await service.login({
        email: 'owner@ex.com',
        password: 'secret',
        rememberMe: true,
      } as LoginRequest);

      expect(result.session.sessionCookie).toBe('session-cookie');
      expect(result.me.email).toBe('owner@ex.com');
      expect(result.me.role).toBe('OWNER');
    });

    it('throws UnauthorizedException when local user is missing', async () => {
      signInWithPassword.mockResolvedValue({ idToken: 'id-tok' });
      verifyIdToken.mockResolvedValue({ uid: 'missing' });
      usersFindOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@y.com', password: 'p' } as LoginRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('uses short session when rememberMe is false', async () => {
      signInWithPassword.mockResolvedValue({ idToken: 'id-tok' });
      verifyIdToken.mockResolvedValue({ uid: 'fb-1' });
      usersFindOne.mockResolvedValue(baseUser());

      const result = await service.login({
        email: 'owner@ex.com',
        password: 'secret',
        rememberMe: false,
      } as LoginRequest);

      expect(result.session.expiresInMs).toBe(1 * 24 * 60 * 60 * 1000);
    });
  });

  describe('loginWithGoogle', () => {
    it('logs in an existing Google user', async () => {
      verifyIdToken.mockResolvedValue({
        uid: 'fb-1',
        email: 'owner@ex.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      });
      usersFindOne.mockResolvedValue(baseUser());

      const result = await service.loginWithGoogle({
        idToken: 'g-tok',
        rememberMe: true,
      } as GoogleLoginRequest);

      expect(result.me.id).toBe('u1');
      expect(setCustomUserClaims).toHaveBeenCalledWith('fb-1', {
        role: 'OWNER',
        companyId: 'c1',
      });
    });

    it('throws UnauthorizedException for invalid Google token', async () => {
      verifyIdToken.mockRejectedValue(new Error('bad'));
      await expect(
        service.loginWithGoogle({ idToken: 'bad' } as GoogleLoginRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for non-Google provider', async () => {
      verifyIdToken.mockResolvedValue({
        uid: 'fb-1',
        firebase: { sign_in_provider: 'password' },
      });
      await expect(
        service.loginWithGoogle({ idToken: 'tok' } as GoogleLoginRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('links an existing email account to the Google uid', async () => {
      const existing = baseUser();
      existing.firebaseUid = 'old-fb';
      existing.emailVerified = false;
      verifyIdToken.mockResolvedValue({
        uid: 'new-fb',
        email: 'Owner@Ex.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      });
      usersFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);

      const result = await service.loginWithGoogle({
        idToken: 'g-tok',
      } as GoogleLoginRequest);

      expect(usersSave).toHaveBeenCalled();
      expect(result.me.email).toBe('owner@ex.com');
      expect(existing.firebaseUid).toBe('new-fb');
      expect(existing.emailVerified).toBe(true);
    });

    it('throws UnauthorizedException when no local account exists', async () => {
      verifyIdToken.mockResolvedValue({
        uid: 'fb-new',
        email: 'new@ex.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      });
      usersFindOne.mockResolvedValue(null);

      await expect(
        service.loginWithGoogle({ idToken: 'g-tok' } as GoogleLoginRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('marks email verified when Google says so', async () => {
      const user = baseUser();
      user.emailVerified = false;
      verifyIdToken.mockResolvedValue({
        uid: 'fb-1',
        email: 'owner@ex.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      });
      usersFindOne.mockResolvedValue(user);

      await service.loginWithGoogle({ idToken: 'g-tok' } as GoogleLoginRequest);
      expect(usersSave).toHaveBeenCalled();
      expect(user.emailVerified).toBe(true);
    });
  });

  describe('registerCompany', () => {
    const input = {
      company: { name: 'Salão', slug: 'salao', phone: '+5511' },
      owner: {
        email: 'owner@ex.com',
        password: 'secret123',
        name: 'Owner',
      },
    } as RegisterCompanyRequest;

    it('creates company, owner and session', async () => {
      companiesFindOne.mockResolvedValue(null);
      usersFindOne.mockResolvedValue(null);
      signUpWithPassword.mockResolvedValue({ idToken: 'id', localId: 'fb-new' });
      transaction.mockImplementation(
        async (cb: (manager: { create: jest.Mock; save: jest.Mock }) => Promise<unknown>) => {
          const manager = {
            create: jest.fn((_Entity: unknown, data: Record<string, unknown>) => data),
            save: jest.fn(async (entity: Record<string, unknown>) => ({
              ...entity,
              id: entity['slug'] ? 'c1' : 'u1',
              companyId: entity['companyId'] ?? 'c1',
            })),
          };
          return cb(manager);
        },
      );

      const result = await service.registerCompany(input);
      expect(result.me.role).toBe('OWNER');
      expect(result.session.sessionCookie).toBe('session-cookie');
      expect(setCustomUserClaims).toHaveBeenCalledWith('fb-new', {
        role: 'OWNER',
        companyId: 'c1',
      });
    });

    it('throws ConflictException when slug is taken', async () => {
      companiesFindOne.mockResolvedValue({ id: 'other' });
      await expect(service.registerCompany(input)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when email is taken', async () => {
      companiesFindOne.mockResolvedValue(null);
      usersFindOne.mockResolvedValue(baseUser());
      await expect(service.registerCompany(input)).rejects.toThrow(ConflictException);
    });

    it('deletes Firebase user when transaction fails after signup', async () => {
      companiesFindOne.mockResolvedValue(null);
      usersFindOne.mockResolvedValue(null);
      signUpWithPassword.mockResolvedValue({ idToken: 'id', localId: 'fb-new' });
      transaction.mockRejectedValue(new Error('tx failed'));
      deleteUser.mockResolvedValue(undefined);

      await expect(service.registerCompany(input)).rejects.toThrow('tx failed');
      expect(deleteUser).toHaveBeenCalledWith('fb-new');
    });

    it('still rethrows when Firebase cleanup fails', async () => {
      companiesFindOne.mockResolvedValue(null);
      usersFindOne.mockResolvedValue(null);
      signUpWithPassword.mockResolvedValue({ idToken: 'id', localId: 'fb-new' });
      transaction.mockRejectedValue(new Error('tx failed'));
      deleteUser.mockRejectedValue(new Error('cleanup failed'));

      await expect(service.registerCompany(input)).rejects.toThrow('tx failed');
    });
  });

  describe('registerCustomer', () => {
    const input = {
      email: 'c@ex.com',
      password: 'secret123',
      name: 'Customer',
      phone: '+5511',
    } as RegisterCustomerRequest;

    it('creates a customer and session', async () => {
      usersFindOne.mockResolvedValue(null);
      signUpWithPassword.mockResolvedValue({ idToken: 'id', localId: 'fb-c' });
      usersSave.mockResolvedValue({
        ...baseUser(),
        id: 'u2',
        firebaseUid: 'fb-c',
        email: 'c@ex.com',
        name: 'Customer',
        role: 'CUSTOMER',
        companyId: null,
      });

      const result = await service.registerCustomer(input);
      expect(result.me.role).toBe('CUSTOMER');
      expect(setCustomUserClaims).toHaveBeenCalledWith('fb-c', { role: 'CUSTOMER' });
    });

    it('throws ConflictException when email exists', async () => {
      usersFindOne.mockResolvedValue(baseUser());
      await expect(service.registerCustomer(input)).rejects.toThrow(ConflictException);
    });

    it('deletes Firebase user when local save fails', async () => {
      usersFindOne.mockResolvedValue(null);
      signUpWithPassword.mockResolvedValue({ idToken: 'id', localId: 'fb-c' });
      usersSave.mockRejectedValue(new Error('db'));
      deleteUser.mockResolvedValue(undefined);

      await expect(service.registerCustomer(input)).rejects.toThrow('db');
      expect(deleteUser).toHaveBeenCalledWith('fb-c');
    });
  });

  describe('logout', () => {
    it('returns early when cookie is missing', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(verifySessionCookie).not.toHaveBeenCalled();
    });

    it('revokes refresh tokens for a valid cookie', async () => {
      verifySessionCookie.mockResolvedValue({ sub: 'fb-1' });
      await service.logout('cookie');
      expect(revokeRefreshTokens).toHaveBeenCalledWith('fb-1');
    });

    it('ignores invalid cookies', async () => {
      verifySessionCookie.mockRejectedValue(new Error('bad'));
      await expect(service.logout('bad')).resolves.toBeUndefined();
    });
  });

  describe('me', () => {
    it('maps authenticated user to MeResponse', () => {
      const user: AuthenticatedUser = {
        id: 'u1',
        firebaseUid: 'fb',
        email: 'a@b.com',
        name: 'A',
        phone: null,
        role: 'STAFF',
        companyId: 'c1',
        emailVerified: true,
        phoneVerified: false,
      };
      expect(service.me(user)).toEqual({
        id: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: 'STAFF',
        companyId: 'c1',
        emailVerified: true,
        phoneVerified: false,
      });
    });
  });

  describe('createSession via login', () => {
    it('throws BadRequestException when session max age is invalid', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'SESSION_COOKIE_MAX_AGE_DAYS') return 0;
        return undefined;
      });
      signInWithPassword.mockResolvedValue({ idToken: 'id-tok' });

      await expect(
        service.login({ email: 'a@b.com', password: 'p' } as LoginRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
