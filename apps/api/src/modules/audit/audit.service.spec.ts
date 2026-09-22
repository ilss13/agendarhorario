import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const create = jest.fn();
  const save = jest.fn();
  const repo = { create, save } as unknown as Repository<AuditLog>;
  let service: AuditService;

  beforeEach(() => {
    create.mockReset();
    save.mockReset();
    create.mockImplementation((row: Partial<AuditLog>) => row);
    save.mockResolvedValue(undefined);
    service = new AuditService(repo);
  });

  it('persists an audit entry with null defaults', async () => {
    await service.log({
      action: 'CREATE',
      entityType: 'Service',
      entityId: 'svc-1',
    });

    expect(create).toHaveBeenCalledWith({
      action: 'CREATE',
      entityType: 'Service',
      entityId: 'svc-1',
      actorUserId: null,
      actorEmail: null,
      companyId: null,
      metadata: null,
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('persists optional actor and metadata when provided', async () => {
    await service.log({
      action: 'CANCEL',
      entityType: 'Appointment',
      entityId: 'a1',
      actorUserId: 'u1',
      actorEmail: 'u@x.com',
      companyId: 'c1',
      metadata: { from: 'admin' },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'u1',
        actorEmail: 'u@x.com',
        companyId: 'c1',
        metadata: { from: 'admin' },
      }),
    );
  });

  it('swallows repository errors without throwing', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    save.mockRejectedValue(new Error('db down'));

    await expect(service.log({ action: 'UPDATE', entityType: 'Company' })).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
