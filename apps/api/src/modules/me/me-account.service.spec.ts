import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { Appointment } from '../appointments/appointment.entity';
import type { AuditService } from '../audit/audit.service';
import type { Customer } from '../customers/customer.entity';
import type { FirebaseAdminService } from '../../shared/infra/firebase/firebase-admin.service';
import type { User } from '../users/user.entity';
import type { Verification } from '../verification/verification.entity';
import { MeAccountService } from './me-account.service';

type Qb = {
  where: jest.Mock;
  andWhere: jest.Mock;
  getMany: jest.Mock;
};

describe('MeAccountService', () => {
  const userPick = {
    id: 'user-1',
    email: 'user@example.com',
    phone: '+5511999999999',
    firebaseUid: 'fb-1',
  };

  let users: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let customers: { createQueryBuilder: jest.Mock };
  let appointments: jest.Mocked<Pick<Repository<Appointment>, 'find'>>;
  let verifications: jest.Mocked<Partial<Repository<Verification>>>;
  let firebase: { auth: { deleteUser: jest.Mock } };
  let audit: jest.Mocked<Pick<AuditService, 'log'>>;
  let dataSource: { transaction: jest.Mock };
  let service: MeAccountService;
  let customersQb: Qb;

  const dbUser = {
    id: 'user-1',
    name: 'User',
    email: 'user@example.com',
    phone: '+5511999999999',
    role: 'CUSTOMER' as const,
    companyId: null,
    firebaseUid: 'fb-1',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
  } as User;

  beforeEach(() => {
    customersQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    users = { findOne: jest.fn() };
    customers = { createQueryBuilder: jest.fn().mockReturnValue(customersQb) };
    appointments = { find: jest.fn() };
    verifications = {};
    firebase = { auth: { deleteUser: jest.fn().mockResolvedValue(undefined) } };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      transaction: jest.fn(async (fn: (manager: unknown) => Promise<void>) =>
        fn({
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn(async (entity: unknown) => entity),
            softDelete: jest.fn().mockResolvedValue(undefined),
            softRemove: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      ),
    };

    service = new MeAccountService(
      users as unknown as Repository<User>,
      customers as unknown as Repository<Customer>,
      appointments as unknown as Repository<Appointment>,
      verifications as unknown as Repository<Verification>,
      firebase as unknown as FirebaseAdminService,
      audit as unknown as AuditService,
      dataSource as unknown as DataSource,
    );
  });

  describe('export', () => {
    it('exports user data with customers and appointments', async () => {
      const customer = {
        id: 'cust-1',
        companyId: 'co-1',
        name: 'Cust',
        email: 'c@example.com',
        phone: null,
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      } as Customer;
      const appointment = {
        id: 'appt-1',
        companyId: 'co-1',
        serviceId: 'svc-1',
        startsAt: new Date('2026-02-01T12:00:00.000Z'),
        endsAt: new Date('2026-02-01T12:30:00.000Z'),
        status: 'PENDING',
        cancelReason: null,
        createdAt: new Date('2026-01-03T10:00:00.000Z'),
      } as Appointment;

      users.findOne.mockResolvedValue(dbUser);
      customersQb.getMany.mockResolvedValue([customer]);
      appointments.find.mockResolvedValue([appointment]);

      const result = await service.export(userPick);

      expect(result.user.id).toBe('user-1');
      expect(result.customers).toHaveLength(1);
      expect(result.appointments[0].id).toBe('appt-1');
      expect(result.exportedAt).toEqual(expect.any(String));
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LGPD_EXPORT', entityId: 'user-1' }),
      );
      expect(appointments.find).toHaveBeenCalled();
    });

    it('skips appointment lookup when user has no customers', async () => {
      users.findOne.mockResolvedValue(dbUser);
      customersQb.getMany.mockResolvedValue([]);

      const result = await service.export(userPick);

      expect(result.appointments).toEqual([]);
      expect(appointments.find).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user is missing', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(service.export(userPick)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('anonymizes customers, soft-removes user and deletes firebase auth', async () => {
      const customer = {
        id: 'cust-1',
        name: 'Cust',
        email: 'c@example.com',
        phone: '1',
        userId: 'user-1',
        notes: 'note',
      } as Customer;
      users.findOne.mockResolvedValue(dbUser);
      customersQb.getMany.mockResolvedValue([customer]);

      await service.deleteAccount(userPick);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(firebase.auth.deleteUser).toHaveBeenCalledWith('fb-1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LGPD_DELETE', entityId: 'user-1' }),
      );
      expect(customer.email).toBeNull();
      expect(customer.phone).toBeNull();
      expect(customer.userId).toBeNull();
      expect(customer.notes).toBeNull();
      expect(customer.name).toMatch(/^Cliente anonimizado #/);
    });

    it('throws NotFoundException when user is missing', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(service.deleteAccount(userPick)).rejects.toThrow(NotFoundException);
    });

    it('blocks OWNER with companyId', async () => {
      users.findOne.mockResolvedValue({
        ...dbUser,
        role: 'OWNER',
        companyId: 'co-1',
      } as User);

      await expect(service.deleteAccount(userPick)).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('continues when firebase delete fails', async () => {
      users.findOne.mockResolvedValue(dbUser);
      customersQb.getMany.mockResolvedValue([]);
      firebase.auth.deleteUser.mockRejectedValue(new Error('firebase down'));

      await expect(service.deleteAccount(userPick)).resolves.toBeUndefined();
      expect(audit.log).toHaveBeenCalled();
    });

    it('allows OWNER without companyId', async () => {
      users.findOne.mockResolvedValue({
        ...dbUser,
        role: 'OWNER',
        companyId: null,
      } as User);
      customersQb.getMany.mockResolvedValue([]);

      await expect(service.deleteAccount(userPick)).resolves.toBeUndefined();
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });
});
