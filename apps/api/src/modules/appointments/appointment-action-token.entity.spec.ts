import { AppointmentActionToken } from './appointment-action-token.entity';

describe('AppointmentActionToken', () => {
  it('holds token fields when constructed', () => {
    const expiresAt = new Date('2026-05-12T00:00:00.000Z');
    const entity = new AppointmentActionToken();
    entity.id = 'token-1';
    entity.appointmentId = 'appt-1';
    entity.kind = 'CONFIRM';
    entity.tokenHash = 'abc123';
    entity.expiresAt = expiresAt;
    entity.consumedAt = null;

    expect(entity.kind).toBe('CONFIRM');
    expect(entity.tokenHash).toBe('abc123');
    expect(entity.expiresAt).toBe(expiresAt);
    expect(entity.consumedAt).toBeNull();
  });

  it('marks token as consumed', () => {
    const consumedAt = new Date('2026-05-11T12:00:00.000Z');
    const entity = new AppointmentActionToken();
    entity.kind = 'CANCEL';
    entity.consumedAt = consumedAt;

    expect(entity.kind).toBe('CANCEL');
    expect(entity.consumedAt).toBe(consumedAt);
  });
});
