import { DateTime } from 'luxon';
import { Verification } from './verification.entity';

const TZ = 'America/Sao_Paulo';

describe('Verification', () => {
  it('stores a pending email OTP hash with expiry', () => {
    const verification = new Verification();
    const expiresAt = DateTime.fromISO('2026-05-11T12:00:00', { zone: TZ }).toJSDate();
    verification.type = 'EMAIL';
    verification.target = 'user@ex.com';
    verification.codeHash = 'abc';
    verification.expiresAt = expiresAt;
    verification.attempts = 0;
    verification.consumedAt = null;

    expect(verification.type).toBe('EMAIL');
    expect(verification.attempts).toBe(0);
    expect(verification.consumedAt).toBeNull();
    expect(verification.expiresAt).toEqual(expiresAt);
  });

  it('marks SMS verification as consumed', () => {
    const consumedAt = DateTime.fromISO('2026-05-11T12:05:00', { zone: TZ }).toJSDate();
    const verification = new Verification();
    verification.type = 'SMS';
    verification.target = '+5511999999999';
    verification.codeHash = 'hash';
    verification.expiresAt = DateTime.fromISO('2026-05-11T12:10:00', { zone: TZ }).toJSDate();
    verification.attempts = 2;
    verification.consumedAt = consumedAt;

    expect(verification.type).toBe('SMS');
    expect(verification.consumedAt).toEqual(consumedAt);
    expect(verification.attempts).toBe(2);
  });
});
