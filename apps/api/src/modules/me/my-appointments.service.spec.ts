import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import type { DataSource, Repository } from 'typeorm';
import type { Appointment } from '../appointments/appointment.entity';
import type { BusinessException } from '../business-hours/business-exception.entity';
import type { BusinessHour } from '../business-hours/business-hour.entity';
import type { Company } from '../companies/company.entity';
import type { Customer } from '../customers/customer.entity';
import type { NotificationsService } from '../notifications/notifications.service';
import type { Service } from '../services/service.entity';
import type { User } from '../users/user.entity';
import { MyAppointmentsService } from './my-appointments.service';

jest.mock('../availability/availability.service', () => ({
  computeSlotsForDate: jest.fn(),
  occupiedRangesOverlap: jest.fn(),
}));

import { computeSlotsForDate, occupiedRangesOverlap } from '../availability/availability.service';

const mockedComputeSlots = computeSlotsForDate as jest.MockedFunction<typeof computeSlotsForDate>;
const mockedOverlap = occupiedRangesOverlap as jest.MockedFunction<typeof occupiedRangesOverlap>;

type ListQb = {
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

describe('MyAppointmentsService', () => {
  const TZ = 'America/Sao_Paulo';
  const user: Pick<User, 'id' | 'email' | 'phone'> = {
    id: 'user-1',
    email: 'user@example.com',
    phone: '+5511999999999',
  };

  let appointments: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
  };
  let customers: { createQueryBuilder: jest.Mock };
  let hours: jest.Mocked<Pick<Repository<BusinessHour>, 'find'>>;
  let exceptions: jest.Mocked<Pick<Repository<BusinessException>, 'find'>>;
  let notifications: jest.Mocked<
    Pick<NotificationsService, 'cancelScheduled' | 'enqueueImmediate' | 'scheduleReminder'>
  >;
  let dataSource: { transaction: jest.Mock };
  let service: MyAppointmentsService;
  let customersQb: { where: jest.Mock; andWhere: jest.Mock; select: jest.Mock; getMany: jest.Mock };
  let listQb: ListQb;

  const company = {
    id: 'co-1',
    name: 'Salon',
    slug: 'salon',
    timezone: TZ,
  } as Company;

  const svc = {
    id: 'svc-1',
    name: 'Cut',
    durationMinutes: 30,
    bufferMinutes: 0,
  } as Service;

  const customer = {
    id: 'cust-1',
    companyId: 'co-1',
    name: 'Cust',
  } as Customer;

  const futureStart = DateTime.now().setZone(TZ).plus({ days: 3 }).set({
    hour: 10,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  function ownedAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
      id: 'appt-1',
      companyId: company.id,
      serviceId: svc.id,
      customerId: customer.id,
      startsAt: futureStart.toJSDate(),
      endsAt: futureStart.plus({ minutes: 30 }).toJSDate(),
      status: 'PENDING',
      cancelReason: null,
      company,
      service: svc,
      customer,
      ...overrides,
    } as Appointment;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    customersQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'cust-1' }]),
    };
    listQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    appointments = {
      createQueryBuilder: jest.fn().mockReturnValue(listQb),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (a: Appointment) => a),
    };
    customers = { createQueryBuilder: jest.fn().mockReturnValue(customersQb) };
    hours = { find: jest.fn().mockResolvedValue([]) };
    exceptions = { find: jest.fn().mockResolvedValue([]) };
    notifications = {
      cancelScheduled: jest.fn().mockResolvedValue(undefined),
      enqueueImmediate: jest.fn().mockResolvedValue(undefined),
      scheduleReminder: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    service = new MyAppointmentsService(
      appointments as unknown as Repository<Appointment>,
      customers as unknown as Repository<Customer>,
      {} as Repository<Company>,
      {} as Repository<Service>,
      hours as unknown as Repository<BusinessHour>,
      exceptions as unknown as Repository<BusinessException>,
      notifications as unknown as NotificationsService,
      dataSource as unknown as DataSource,
    );
  });

  describe('list', () => {
    it('returns empty page when user owns no customers', async () => {
      customersQb.getMany.mockResolvedValue([]);
      const result = await service.list(user, { page: 1, pageSize: 10, range: 'all' });
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
      expect(appointments.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('lists upcoming appointments ordered ascending', async () => {
      const row = ownedAppointment();
      listQb.getManyAndCount.mockResolvedValue([[row], 1]);

      const result = await service.list(user, { page: 1, pageSize: 10, range: 'upcoming' });

      expect(listQb.andWhere).toHaveBeenCalledWith('a.startsAt >= :now', expect.any(Object));
      expect(listQb.orderBy).toHaveBeenCalledWith('a.startsAt', 'ASC');
      expect(result.items[0]).toMatchObject({
        id: 'appt-1',
        companyName: 'Salon',
        serviceName: 'Cut',
      });
      expect(result.total).toBe(1);
    });

    it('lists past appointments ordered descending', async () => {
      listQb.getManyAndCount.mockResolvedValue([[], 0]);
      await service.list(user, { page: 2, pageSize: 5, range: 'past' });
      expect(listQb.andWhere).toHaveBeenCalledWith('a.startsAt < :now', expect.any(Object));
      expect(listQb.orderBy).toHaveBeenCalledWith('a.startsAt', 'DESC');
      expect(listQb.skip).toHaveBeenCalledWith(5);
      expect(listQb.take).toHaveBeenCalledWith(5);
    });

    it('lists all range without startsAt filter', async () => {
      listQb.getManyAndCount.mockResolvedValue([[], 0]);
      await service.list(user, { page: 1, pageSize: 10, range: 'all' });
      const startFilters = listQb.andWhere.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && String(c[0]).includes('startsAt'),
      );
      expect(startFilters).toHaveLength(0);
      expect(listQb.orderBy).toHaveBeenCalledWith('a.startsAt', 'DESC');
    });

    it('falls back to empty names when joins are missing', async () => {
      const row = ownedAppointment({
        company: undefined,
        service: undefined,
      } as Partial<Appointment>);
      listQb.getManyAndCount.mockResolvedValue([[row], 1]);
      const result = await service.list(user, { page: 1, pageSize: 10, range: 'all' });
      expect(result.items[0].companyName).toBe('');
      expect(result.items[0].serviceName).toBe('');
    });
  });

  describe('getById', () => {
    it('returns dto for owned appointment', async () => {
      appointments.findOne.mockResolvedValue(ownedAppointment());
      const dto = await service.getById(user, 'appt-1');
      expect(dto).toMatchObject({ id: 'appt-1', companySlug: 'salon', status: 'PENDING' });
    });

    it('throws NotFoundException when user has no customers', async () => {
      customersQb.getMany.mockResolvedValue([]);
      await expect(service.getById(user, 'appt-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when appointment is missing', async () => {
      appointments.findOne.mockResolvedValue(null);
      await expect(service.getById(user, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when appointment belongs to another customer', async () => {
      appointments.findOne.mockResolvedValue(ownedAppointment({ customerId: 'other' }));
      await expect(service.getById(user, 'appt-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('cancels pending future appointment and notifies', async () => {
      const appt = ownedAppointment();
      appointments.findOne.mockResolvedValue(appt);

      const dto = await service.cancel(user, 'appt-1', 'busy');

      expect(appt.status).toBe('CANCELLED');
      expect(appt.cancelReason).toBe('busy');
      expect(appointments.save).toHaveBeenCalledWith(appt);
      expect(notifications.cancelScheduled).toHaveBeenCalledWith('appt-1');
      expect(notifications.enqueueImmediate).toHaveBeenCalledWith('appt-1', 'CANCELLED');
      expect(dto.status).toBe('CANCELLED');
    });

    it('uses default cancel reason when none provided', async () => {
      const appt = ownedAppointment();
      appointments.findOne.mockResolvedValue(appt);
      await service.cancel(user, 'appt-1', null);
      expect(appt.cancelReason).toBe('Cancelado pelo cliente');
    });

    it('is idempotent for already cancelled appointments', async () => {
      const appt = ownedAppointment({ status: 'CANCELLED', cancelReason: 'old' });
      appointments.findOne.mockResolvedValue(appt);
      const dto = await service.cancel(user, 'appt-1', 'new');
      expect(appointments.save).not.toHaveBeenCalled();
      expect(notifications.enqueueImmediate).not.toHaveBeenCalled();
      expect(dto.status).toBe('CANCELLED');
    });

    it('rejects cancelling past appointments', async () => {
      appointments.findOne.mockResolvedValue(
        ownedAppointment({
          startsAt: DateTime.now().minus({ days: 1 }).toJSDate(),
          endsAt: DateTime.now().minus({ days: 1 }).plus({ minutes: 30 }).toJSDate(),
        }),
      );
      await expect(service.cancel(user, 'appt-1', null)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reschedule', () => {
    const newStartIso = futureStart.plus({ days: 1 }).toISO()!;

    function setupHappyReschedule() {
      const appt = ownedAppointment();
      appointments.findOne.mockResolvedValue(appt);
      mockedComputeSlots.mockReturnValue([
        { start: DateTime.fromISO(newStartIso, { zone: TZ }).toISO()!, end: 'x' },
      ]);
      mockedOverlap.mockReturnValue(false);
      const created = {
        id: 'appt-2',
        companyId: company.id,
        serviceId: svc.id,
        customerId: customer.id,
        startsAt: DateTime.fromISO(newStartIso, { zone: TZ }).toJSDate(),
        endsAt: DateTime.fromISO(newStartIso, { zone: TZ }).plus({ minutes: 30 }).toJSDate(),
        status: 'PENDING' as const,
      } as Appointment;

      const lockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      const apptRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(lockQb),
        save: jest.fn(async (entity: Appointment) => entity),
        create: jest.fn((data: Partial<Appointment>) => ({ ...data }) as Appointment),
      };
      apptRepo.save.mockResolvedValueOnce(appt).mockResolvedValueOnce(created);

      dataSource.transaction.mockImplementation(async (fn: (m: unknown) => Promise<Appointment>) =>
        fn({ getRepository: () => apptRepo }),
      );
      return { appt, created };
    }

    it('reschedules to available slot and schedules reminders', async () => {
      setupHappyReschedule();
      const dto = await service.reschedule(user, 'appt-1', newStartIso);
      expect(dto.id).toBe('appt-2');
      expect(notifications.cancelScheduled).toHaveBeenCalledWith('appt-1');
      expect(notifications.enqueueImmediate).toHaveBeenCalledWith('appt-1', 'CANCELLED');
      expect(notifications.enqueueImmediate).toHaveBeenCalledWith('appt-2', 'CREATED');
      expect(notifications.scheduleReminder).toHaveBeenCalled();
    });

    it('rejects cancelled appointment', async () => {
      appointments.findOne.mockResolvedValue(ownedAppointment({ status: 'CANCELLED' }));
      await expect(service.reschedule(user, 'appt-1', newStartIso)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects past appointment', async () => {
      appointments.findOne.mockResolvedValue(
        ownedAppointment({
          startsAt: DateTime.now().minus({ hours: 2 }).toJSDate(),
          endsAt: DateTime.now().minus({ hours: 1 }).toJSDate(),
        }),
      );
      await expect(service.reschedule(user, 'appt-1', newStartIso)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects invalid datetime', async () => {
      appointments.findOne.mockResolvedValue(ownedAppointment());
      await expect(service.reschedule(user, 'appt-1', 'not-a-date')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects reschedule into the past', async () => {
      appointments.findOne.mockResolvedValue(ownedAppointment());
      const pastIso = DateTime.now().setZone(TZ).minus({ days: 1 }).toISO()!;
      await expect(service.reschedule(user, 'appt-1', pastIso)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects unavailable slot', async () => {
      appointments.findOne.mockResolvedValue(ownedAppointment());
      mockedComputeSlots.mockReturnValue([]);
      await expect(service.reschedule(user, 'appt-1', newStartIso)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException when locked rows overlap', async () => {
      appointments.findOne.mockResolvedValue(ownedAppointment());
      mockedComputeSlots.mockReturnValue([
        { start: DateTime.fromISO(newStartIso, { zone: TZ }).toISO()!, end: 'x' },
      ]);
      mockedOverlap.mockReturnValue(true);

      const lockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'other' }]),
      };
      dataSource.transaction.mockImplementation(async (fn: (m: unknown) => Promise<Appointment>) =>
        fn({
          getRepository: () => ({
            createQueryBuilder: () => lockQb,
            save: jest.fn(),
            create: jest.fn(),
          }),
        }),
      );

      await expect(service.reschedule(user, 'appt-1', newStartIso)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
