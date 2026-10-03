import {
  confirmVerificationSchema,
  requestVerificationSchema,
  verificationChannelSchema,
  verificationTokenResponseSchema,
} from './verification';

describe('verification contracts', () => {
  it('accepts an email and phone request', () => {
    const result = requestVerificationSchema.safeParse({
      email: ' Ana@Studio.com ',
      phone: '+5511999999999',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('ana@studio.com');
  });

  it('rejects an unknown channel and a code that is not 6 digits', () => {
    expect(verificationChannelSchema.safeParse('WHATSAPP').success).toBe(false);
    expect(verificationChannelSchema.safeParse('EMAIL').success).toBe(true);
    expect(
      confirmVerificationSchema.safeParse({ channel: 'SMS', target: '+5511999999999', code: '12' })
        .success,
    ).toBe(false);
    expect(
      confirmVerificationSchema.safeParse({
        channel: 'SMS',
        target: '+5511999999999',
        code: ' 123456 ',
      }).success,
    ).toBe(true);
  });

  it('accepts a verification token response', () => {
    expect(
      verificationTokenResponseSchema.safeParse({
        verificationToken: 'token',
        channel: 'EMAIL',
        target: 'ana@studio.com',
        expiresAt: '2026-10-02T16:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});
