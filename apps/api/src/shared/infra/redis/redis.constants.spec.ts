import { otpLookupKey, REDIS_CLIENT } from './redis.constants';

describe('REDIS_CLIENT', () => {
  it('exports the redis injection token', () => {
    expect(REDIS_CLIENT).toBe('REDIS_CLIENT');
  });
});

describe('otpLookupKey', () => {
  it('builds email otp lookup key', () => {
    expect(otpLookupKey('email', 'a@b.com')).toBe('otp:dev:email:a@b.com');
  });

  it('builds phone otp lookup key', () => {
    expect(otpLookupKey('phone', '+5511999999999')).toBe('otp:dev:phone:+5511999999999');
  });
});
