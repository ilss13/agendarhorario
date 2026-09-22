import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser', () => {
  class Probe {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handler(_user: AuthenticatedUser): void {}
  }

  beforeAll(() => {
    const decorator = CurrentUser();
    decorator(Probe.prototype, 'handler', 0);
  });

  const invokeFactory = (ctx: ExecutionContext): AuthenticatedUser => {
    const meta = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler') as Record<
      string,
      { factory: (data: unknown, context: ExecutionContext) => AuthenticatedUser }
    >;
    const key = Object.keys(meta)[0];
    return meta[key].factory(undefined, ctx);
  };

  it('returns the user attached to the request', () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      firebaseUid: 'fb',
      email: 'u@x.com',
      name: 'U',
      phone: null,
      role: 'STAFF',
      companyId: 'c1',
      emailVerified: true,
      phoneVerified: true,
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;

    expect(invokeFactory(ctx)).toEqual(user);
  });

  it('returns undefined when the request has no user', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;

    expect(invokeFactory(ctx)).toBeUndefined();
  });
});
