import { AuditLog, type AuditAction } from './audit-log.entity';

describe('AuditLog', () => {
  it('holds audit fields including nullable actor and metadata', () => {
    const log = new AuditLog();
    const action: AuditAction = 'CREATE';
    log.actorUserId = 'user-1';
    log.actorEmail = 'a@b.com';
    log.companyId = 'company-1';
    log.action = action;
    log.entityType = 'Appointment';
    log.entityId = 'appt-1';
    log.metadata = { reason: 'test' };

    expect(log.action).toBe('CREATE');
    expect(log.entityType).toBe('Appointment');
    expect(log.metadata).toEqual({ reason: 'test' });
  });

  it('allows null actor and metadata for system events', () => {
    const log = new AuditLog();
    log.actorUserId = null;
    log.actorEmail = null;
    log.companyId = null;
    log.action = 'LGPD_DELETE';
    log.entityType = 'Customer';
    log.entityId = null;
    log.metadata = null;

    expect(log.actorUserId).toBeNull();
    expect(log.entityId).toBeNull();
    expect(log.metadata).toBeNull();
  });
});
