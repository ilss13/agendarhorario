import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';
import { TenantContextService } from './tenant-context.service';
import { TenantInterceptor } from './tenant.interceptor';

describe('TenantInterceptor', () => {
  const tenant = new TenantContextService();
  const interceptor = new TenantInterceptor(tenant);

  const makeCtx = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => (user ? { user } : {}),
      }),
    }) as unknown as ExecutionContext;

  it('passes through without tenant context when request has no user', async () => {
    const handle = jest.fn().mockReturnValue(of('ok'));
    const next = { handle } as CallHandler;

    const result = await firstValueFrom(interceptor.intercept(makeCtx(), next));

    expect(result).toBe('ok');
    expect(tenant.get()).toBeUndefined();
  });

  it('runs handler inside tenant context when user is present', async () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      firebaseUid: 'fb',
      email: 'a@b.com',
      name: 'A',
      phone: null,
      role: 'OWNER',
      companyId: 'c1',
      emailVerified: true,
      phoneVerified: false,
    };
    let seenCompany: string | null | undefined;
    const next = {
      handle: () => {
        seenCompany = tenant.get()?.companyId;
        return of('ok');
      },
    } as CallHandler;

    const result = await firstValueFrom(interceptor.intercept(makeCtx(user), next));

    expect(result).toBe('ok');
    expect(seenCompany).toBe('c1');
  });
});
