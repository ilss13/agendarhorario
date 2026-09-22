import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest, AuthenticatedUser } from '../../modules/auth/auth.types';
import type { UserRole } from '../../modules/users/user.entity';
import { ROLES_KEY, Roles, RolesGuard } from './roles.guard';

const sampleUser = (role: UserRole): AuthenticatedUser => ({
  id: 'u1',
  firebaseUid: 'fb1',
  email: 'a@b.com',
  name: 'A',
  phone: null,
  role,
  companyId: 'c1',
  emailVerified: true,
  phoneVerified: false,
});

const makeCtx = (user?: AuthenticatedUser): ExecutionContext => {
  const req = { user } as AuthenticatedRequest;
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
};

describe('Roles', () => {
  it('stores required roles on the target via SetMetadata', () => {
    class Sample {
      @Roles('OWNER', 'STAFF')
      handle(): void {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, Sample.prototype.handle)).toEqual(['OWNER', 'STAFF']);
  });
});

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  beforeEach(() => {
    jest.mocked(reflector.getAllAndOverride).mockReset();
  });

  it('allows when no roles are required', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);
    expect(guard.canActivate(makeCtx())).toBe(true);
  });

  it('allows when required roles list is empty', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue([]);
    expect(guard.canActivate(makeCtx())).toBe(true);
  });

  it('allows when user role is in the required list', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['OWNER', 'STAFF'] as UserRole[]);
    expect(guard.canActivate(makeCtx(sampleUser('OWNER')))).toBe(true);
  });

  it('throws ForbiddenException when user is missing', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['OWNER'] as UserRole[]);
    expect(() => guard.canActivate(makeCtx())).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user role is not allowed', () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(['OWNER'] as UserRole[]);
    expect(() => guard.canActivate(makeCtx(sampleUser('CUSTOMER')))).toThrow(ForbiddenException);
  });
});
