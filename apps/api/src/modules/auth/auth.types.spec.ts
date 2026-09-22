import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

describe('auth.types', () => {
  it('describes an authenticated user shape', () => {
    const user: AuthenticatedUser = {
      id: 'u1',
      firebaseUid: 'fb1',
      email: 'a@b.com',
      name: 'Ana',
      phone: null,
      role: 'OWNER',
      companyId: 'c1',
      emailVerified: true,
      phoneVerified: false,
    };

    expect(user.role).toBe('OWNER');
    expect(user.companyId).toBe('c1');
    expect(user.phone).toBeNull();
  });

  it('extends request with the authenticated user', () => {
    const user: AuthenticatedUser = {
      id: 'u2',
      firebaseUid: 'fb2',
      email: 'c@d.com',
      name: 'Bob',
      phone: '+5511000000000',
      role: 'CUSTOMER',
      companyId: null,
      emailVerified: false,
      phoneVerified: true,
    };
    const req = { user } as AuthenticatedRequest;

    expect(req.user.email).toBe('c@d.com');
    expect(req.user.companyId).toBeNull();
  });
});
