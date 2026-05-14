import { loginRequestSchema, registerCompanyRequestSchema, userRoleSchema } from './auth';

describe('auth contracts', () => {
  it('loginRequestSchema accepts valid payload', () => {
    const result = loginRequestSchema.safeParse({
      email: ' User@Example.com ',
      password: 'StrongPass1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('loginRequestSchema rejects missing password', () => {
    const result = loginRequestSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('registerCompanyRequestSchema enforces password strength', () => {
    const result = registerCompanyRequestSchema.safeParse({
      company: { name: 'Acme', slug: 'acme' },
      owner: { name: 'Owner', email: 'o@a.com', password: 'weak' },
    });
    expect(result.success).toBe(false);
  });

  it('registerCompanyRequestSchema accepts valid payload', () => {
    const result = registerCompanyRequestSchema.safeParse({
      company: { name: 'Acme', slug: 'acme-co' },
      owner: { name: 'Owner', email: 'o@a.com', password: 'StrongPass1' },
    });
    expect(result.success).toBe(true);
  });

  it('userRoleSchema rejects unknown role', () => {
    expect(userRoleSchema.safeParse('ADMIN').success).toBe(false);
    expect(userRoleSchema.safeParse('OWNER').success).toBe(true);
  });
});
