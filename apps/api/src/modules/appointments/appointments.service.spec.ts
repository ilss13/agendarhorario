import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { CreateAppointmentRequest } from '@agendarhorario/contracts';
import { BillingService } from '../billing/billing.service';
import { BusinessException } from '../business-hours/business-exception.entity';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Service } from '../services/service.entity';
import { VerificationService } from '../verification/verification.service';
import { Appointment } from './appointment.entity';
import { AppointmentsService } from './appointments.service';

const TZ = 'America/Sao_Paulo';
const mondaySlot = '2026-11-02T12:00:00.000-03:00';

const baseInput = (
  overrides: Partial<CreateAppointmentRequest> = {},
): CreateAppointmentRequest => ({
  serviceId: '11111111-1111-4111-8111-111111111111',
  startsAt: mondaySlot,
  customer: {
    name: 'Ana Silva',
    email: 'ana@example.com',
    phone: '+5511999999999',
    notes: null,
  },
  verificationToken: 'verif-token',
  ...overrides,
});

describe('AppointmentsService', () => {
  const appointments = {
    find: jest.fn(),
  };
  const companies = {
    findOne: jest.fn(),
  };
  const services = {
    findOne: jest.fn(),
  };
  const customers = {};
  const hours = {
    find: jest.fn(),
  };
  const exceptions = {
    find: jest.fn(),
  };
  const verification = {
    verifyToken: jest.fn(),
  };
  const notifications = {
    enqueueImmediate: jest.fn(),
    scheduleReminder: jest.fn(),
  };
  const billing = {
    canBookForCompany: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };

  let service: AppointmentsService;

  const company = {
    id: 'company-1',
    slug: 'barbearia',
    timezone: TZ,
  } as Company;

  const svc = {
    id: '11111111-1111-4111-8111-111111111111',
    companyId: 'company-1',
    name: 'Corte',
    durationMinutes: 30,
    bufferMinutes: 0,
    active: true,
  } as Service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppointmentsService(
      appointments as unknown as Repository<Appointment>,
      companies as unknown as Repository<Company>,
      services as unknown as Repository<Service>,
      customers as unknown as Repository<Customer>,
      hours as unknown as Repository<BusinessHour>,
      exceptions as unknown as Repository<BusinessException>,
      verification as unknown as VerificationService,
      notifications as unknown as NotificationsService,
      billing as unknown as BillingService,
      dataSource as unknown as DataSource,
      config as unknown as ConfigService,
    );

    companies.findOne.mockResolvedValue(company);
    billing.canBookForCompany.mockResolvedValue({
      state: 'AVAILABLE',
      used: 0,
      limit: 100,
      resetAt: null,
    });
    services.findOne.mockResolvedValue(svc);
    verification.verifyToken.mockResolvedValue({
      channel: 'EMAIL',
      target: 'ana@example.com',
    });
    hours.find.mockResolvedValue([{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }]);
    exceptions.find.mockResolvedValue([]);
    appointments.find.mockResolvedValue([]);
    notifications.enqueueImmediate.mockResolvedValue(undefined);
    notifications.scheduleReminder.mockResolvedValue(undefined);
  });

  const mockHappyTransaction = (opts?: {
    locked?: Appointment[];
    existingCustomer?: Customer | null;
  }) => {
    const locked = opts?.locked ?? [];
    const existingCustomer = opts?.existingCustomer ?? null;
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(locked),
    };
    const lockingApptRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      create: jest.fn((v: Partial<Appointment>) => ({ id: 'appt-new', ...v }) as Appointment),
      save: jest.fn(async (v: Appointment) => v),
    };
    const customerRepo = {
      findOne: jest.fn().mockResolvedValue(existingCustomer),
      create: jest.fn((v: Partial<Customer>) => ({ id: 'cust-new', ...v }) as Customer),
      save: jest.fn(async (v: Customer) => v),
    };
    dataSource.transaction.mockImplementation(
      async (cb: (m: EntityManager) => Promise<unknown>) => {
        const manager = {
          getRepository: jest.fn((entity: unknown) => {
            if (entity === Appointment) return lockingApptRepo;
            if (entity === Customer) return customerRepo;
            throw new Error('unexpected entity');
          }),
        } as unknown as EntityManager;
        return cb(manager);
      },
    );
    return { lockingApptRepo, customerRepo };
  };

  it('creates a public booking for a verified customer', async () => {
    mockHappyTransaction();

    const result = await service.createForPublicBooking('barbearia', baseInput());

    expect(result).toMatchObject({
      id: 'appt-new',
      serviceId: svc.id,
      serviceName: 'Corte',
      customerName: 'Ana Silva',
      status: 'PENDING',
    });
    expect(notifications.enqueueImmediate).toHaveBeenCalledWith('appt-new', 'CREATED');
  });

  it('reuses and updates an existing customer by email', async () => {
    const existing = {
      id: 'cust-1',
      companyId: 'company-1',
      name: 'Old',
      email: 'ana@example.com',
      phone: '+5511999999999',
      notes: null,
    } as Customer;
    const { customerRepo } = mockHappyTransaction({ existingCustomer: existing });

    await service.createForPublicBooking(
      'barbearia',
      baseInput({
        customer: {
          name: 'Ana Nova',
          email: 'ana@example.com',
          phone: '+5511999999999',
          notes: 'obs',
        },
      }),
    );

    expect(customerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cust-1', name: 'Ana Nova', notes: 'obs' }),
    );
  });

  it('finds customer by verified phone when email is not verified', async () => {
    verification.verifyToken.mockResolvedValue({
      channel: 'PHONE',
      target: '+5511999999999',
    });
    const existing = {
      id: 'cust-phone',
      companyId: 'company-1',
      name: 'Old',
      email: 'ana@example.com',
      phone: '+5511999999999',
      notes: null,
    } as Customer;
    const { customerRepo } = mockHappyTransaction({ existingCustomer: existing });

    const result = await service.createForPublicBooking('barbearia', baseInput());
    expect(result.customerName).toBe('Ana Silva');
    expect(customerRepo.findOne).toHaveBeenCalledWith({
      where: { companyId: 'company-1', phone: '+5511999999999' },
    });
  });

  it('throws NotFoundException when company slug is unknown', async () => {
    companies.findOne.mockResolvedValue(null);
    await expect(service.createForPublicBooking('x', baseInput())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when subscription is missing', async () => {
    billing.canBookForCompany.mockResolvedValue({
      state: 'NO_SUBSCRIPTION',
      used: 0,
      limit: 0,
      resetAt: null,
    });
    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when company is suspended', async () => {
    billing.canBookForCompany.mockResolvedValue({
      state: 'SUSPENDED',
      used: 0,
      limit: 0,
      resetAt: null,
    });
    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when company is over monthly limit', async () => {
    billing.canBookForCompany.mockResolvedValue({
      state: 'OVER_LIMIT',
      used: 50,
      limit: 50,
      resetAt: new Date(),
    });
    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when service is missing', async () => {
    services.findOne.mockResolvedValue(null);
    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when email and phone are missing', async () => {
    await expect(
      service.createForPublicBooking(
        'barbearia',
        baseInput({
          customer: { name: 'Ana', email: '', phone: '', notes: null },
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when email does not match verification', async () => {
    verification.verifyToken.mockResolvedValue({
      channel: 'EMAIL',
      target: 'other@example.com',
    });
    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when phone does not match verification', async () => {
    verification.verifyToken.mockResolvedValue({
      channel: 'PHONE',
      target: '+5511888888888',
    });
    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when verification token is absent', async () => {
    await expect(
      service.createForPublicBooking('barbearia', baseInput({ verificationToken: undefined })),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for invalid startsAt', async () => {
    await expect(
      service.createForPublicBooking('barbearia', baseInput({ startsAt: 'not-a-date' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when booking in the past', async () => {
    await expect(
      service.createForPublicBooking(
        'barbearia',
        baseInput({ startsAt: '2020-01-01T12:00:00.000-03:00' }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when start is not a valid slot', async () => {
    hours.find.mockResolvedValue([]);
    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws ConflictException when occupied range overlaps under lock', async () => {
    const startsAt = DateTime.fromISO(mondaySlot, { zone: TZ });
    mockHappyTransaction({
      locked: [
        {
          startsAt: startsAt.toJSDate(),
          endsAt: startsAt.plus({ minutes: 30 }).toJSDate(),
        } as Appointment,
      ],
    });

    await expect(service.createForPublicBooking('barbearia', baseInput())).rejects.toThrow(
      ConflictException,
    );
  });

  it('still returns created appointment when notification enqueue fails', async () => {
    mockHappyTransaction();
    notifications.enqueueImmediate.mockRejectedValue(new Error('queue down'));

    await expect(service.createForPublicBooking('barbearia', baseInput())).resolves.toMatchObject({
      id: 'appt-new',
      status: 'PENDING',
    });
  });

  it('schedules far-future reminders after create', async () => {
    mockHappyTransaction();

    await service.createForPublicBooking('barbearia', baseInput());

    expect(notifications.scheduleReminder).toHaveBeenCalledWith(
      'appt-new',
      'REMINDER_24H',
      expect.any(Date),
    );
    expect(notifications.scheduleReminder).toHaveBeenCalledWith(
      'appt-new',
      'REMINDER_1H',
      expect.any(Date),
    );
  });
});
