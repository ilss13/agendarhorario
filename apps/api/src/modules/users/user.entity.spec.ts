import { User, type UserRole } from './user.entity';

describe('User', () => {
  it('stores owner identity and company membership', () => {
    const user = new User();
    const role: UserRole = 'OWNER';
    user.firebaseUid = 'fb-1';
    user.email = 'owner@ex.com';
    user.name = 'Owner';
    user.phone = '+5511777777777';
    user.role = role;
    user.emailVerified = true;
    user.phoneVerified = false;
    user.companyId = 'company-1';

    expect(user.role).toBe('OWNER');
    expect(user.companyId).toBe('company-1');
    expect(user.emailVerified).toBe(true);
  });

  it('allows customers without a company', () => {
    const user = new User();
    user.firebaseUid = 'fb-2';
    user.email = 'c@ex.com';
    user.name = 'Customer';
    user.phone = null;
    user.role = 'CUSTOMER';
    user.emailVerified = false;
    user.phoneVerified = false;
    user.companyId = null;

    expect(user.companyId).toBeNull();
    expect(user.role).toBe('CUSTOMER');
  });
});
