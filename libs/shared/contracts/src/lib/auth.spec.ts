import {
  forgotPasswordRequestSchema,
  googleLoginRequestSchema,
  loginRequestSchema,
  registerCompanyRequestSchema,
  resetPasswordRequestSchema,
  userRoleSchema,
} from './auth';

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

  it('googleLoginRequestSchema accepts idToken', () => {
    const result = googleLoginRequestSchema.safeParse({
      idToken: 'a'.repeat(24),
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });

  it('googleLoginRequestSchema rejects short token', () => {
    const result = googleLoginRequestSchema.safeParse({ idToken: 'short' });
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

  it('forgotPasswordRequestSchema lowercases the email and rejects an empty one', () => {
    const valid = forgotPasswordRequestSchema.safeParse({ email: ' Ana@Studio.com ' });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.email).toBe('ana@studio.com');
    expect(forgotPasswordRequestSchema.safeParse({ email: 'nao-e-email' }).success).toBe(false);
  });

  it('resetPasswordRequestSchema requires a code and a strong password', () => {
    expect(
      resetPasswordRequestSchema.safeParse({ oobCode: 'a'.repeat(12), password: 'Senha123' })
        .success,
    ).toBe(true);
    expect(
      resetPasswordRequestSchema.safeParse({ oobCode: 'curto', password: 'fraca' }).success,
    ).toBe(false);
  });

  it('userRoleSchema rejects unknown role', () => {
    expect(userRoleSchema.safeParse('ADMIN').success).toBe(false);
    expect(userRoleSchema.safeParse('OWNER').success).toBe(true);
  });
});
