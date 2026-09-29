import { buildPasswordResetUrl } from './password-reset-link';

describe('buildPasswordResetUrl', () => {
  it('keeps only the reset code and points it at the app', () => {
    const link = buildPasswordResetUrl(
      'https://proj.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=abc123&apiKey=secret',
      'http://localhost:4200',
    );

    expect(link).toBe('http://localhost:4200/redefinir-senha?oobCode=abc123');
  });

  it('rejects a firebase link without a reset code', () => {
    expect(() =>
      buildPasswordResetUrl(
        'https://proj.firebaseapp.com/__/auth/action?mode=resetPassword',
        'http://localhost:4200',
      ),
    ).toThrow('Link de redefinição sem código');
    expect(() => buildPasswordResetUrl('not-a-url', 'http://localhost:4200')).toThrow(
      'Link de redefinição sem código',
    );
  });
});
