import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import type { MeResponse } from '@agendarhorario/contracts';
import { AuthService } from './auth.service';
import { authGuard, guestGuard, requireRoleGuard } from './auth.guard';

const user = (role: MeResponse['role']): MeResponse => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  name: 'Ana',
  role,
  companyId: null,
  emailVerified: true,
  phoneVerified: false,
});

describe('auth guards', () => {
  const current = signal<MeResponse | null>(null);

  beforeEach(() => {
    current.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => current() !== null,
            user: current,
          },
        },
      ],
    });
  });

  it('lets an authenticated user through and sends guests to login', () => {
    const router = TestBed.inject(Router);
    const allowed = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/me' } as never),
    );
    expect(router.serializeUrl(allowed as never)).toBe('/login?returnUrl=%2Fme');

    current.set(user('CUSTOMER'));
    expect(
      TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/me' } as never)),
    ).toBe(true);
  });

  it('keeps guests on public pages and redirects signed-in users', () => {
    const router = TestBed.inject(Router);
    expect(TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never))).toBe(true);

    current.set(user('OWNER'));
    const tree = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(router.serializeUrl(tree as never)).toBe('/dashboard');
  });

  it('allows the requested role and redirects the others', () => {
    const router = TestBed.inject(Router);
    const guard = requireRoleGuard(['OWNER', 'STAFF']);

    const anonymous = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(router.serializeUrl(anonymous as never)).toBe('/login');

    current.set(user('CUSTOMER'));
    const customer = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(router.serializeUrl(customer as never)).toBe('/me/agendamentos');

    current.set(user('STAFF'));
    expect(TestBed.runInInjectionContext(() => guard({} as never, {} as never))).toBe(true);
  });
});
