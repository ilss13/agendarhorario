import { NotificationLog } from './notification-log.entity';

describe('NotificationLog', () => {
  it('can be instantiated with channel/kind/status fields', () => {
    const log = new NotificationLog();
    log.id = 'log-1';
    log.appointmentId = 'appt-1';
    log.channel = 'EMAIL';
    log.kind = 'CREATED';
    log.status = 'SENT';
    log.providerMessageId = 'msg-1';
    log.errorMessage = null;
    log.createdAt = new Date('2026-01-01T00:00:00.000Z');
    log.updatedAt = new Date('2026-01-01T00:00:00.000Z');
    log.deletedAt = null;
    log.version = 1;

    expect(log.appointmentId).toBe('appt-1');
    expect(log.channel).toBe('EMAIL');
    expect(log.kind).toBe('CREATED');
    expect(log.status).toBe('SENT');
    expect(log.providerMessageId).toBe('msg-1');
    expect(log.errorMessage).toBeNull();
  });

  it('accepts failure and skip statuses', () => {
    const failed = new NotificationLog();
    failed.status = 'FAILED';
    failed.errorMessage = 'provider down';
    failed.channel = 'SMS';
    failed.kind = 'REMINDER_1H';

    const skipped = new NotificationLog();
    skipped.status = 'SKIPPED';
    skipped.channel = 'WHATSAPP';
    skipped.kind = 'CANCELLED';

    expect(failed.status).toBe('FAILED');
    expect(skipped.status).toBe('SKIPPED');
  });
});
