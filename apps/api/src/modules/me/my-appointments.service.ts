import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Brackets, DataSource, IsNull, Not, Repository } from 'typeorm';
import type { MyAppointmentDto, MyAppointmentsQuery } from '@agendarhorario/contracts';
import { computeSlotsForDate } from '../availability/availability.service';
import { BusinessException } from '../business-hours/business-exception.entity';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Service } from '../services/service.entity';
import { User } from '../users/user.entity';
import { Appointment } from '../appointments/appointment.entity';

interface OwnedAppointment {
  appointment: Appointment;
  company: Company;
  service: Service;
  customer: Customer;
}

@Injectable()
export class MyAppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(BusinessHour) private readonly hours: Repository<BusinessHour>,
    @InjectRepository(BusinessException)
    private readonly exceptions: Repository<BusinessException>,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    user: Pick<User, 'id' | 'email' | 'phone'>,
    query: MyAppointmentsQuery,
  ): Promise<{ items: MyAppointmentDto[]; total: number; page: number; pageSize: number }> {
    const customerIds = await this.findCustomerIds(user);
    if (customerIds.length === 0) {
      return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
    }

    const qb = this.appointments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.company', 'c')
      .leftJoinAndSelect('a.service', 's')
      .where('a.customerId IN (:...customerIds)', { customerIds })
      .andWhere('a.deletedAt IS NULL');

    const now = new Date();
    if (query.range === 'upcoming') {
      qb.andWhere('a.startsAt >= :now', { now });
      qb.orderBy('a.startsAt', 'ASC');
    } else if (query.range === 'past') {
      qb.andWhere('a.startsAt < :now', { now });
      qb.orderBy('a.startsAt', 'DESC');
    } else {
      qb.orderBy('a.startsAt', 'DESC');
    }

    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);
    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((row) => ({
        id: row.id,
        companyName: row.company?.name ?? '',
        companySlug: row.company?.slug ?? '',
        serviceId: row.serviceId,
        serviceName: row.service?.name ?? '',
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        status: row.status,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(user: Pick<User, 'id' | 'email' | 'phone'>, id: string): Promise<MyAppointmentDto> {
    const { appointment, company, service } = await this.findOwned(user, id);
    return {
      id: appointment.id,
      companyName: company.name,
      companySlug: company.slug,
      serviceId: service.id,
      serviceName: service.name,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
    };
  }

  async cancel(
    user: Pick<User, 'id' | 'email' | 'phone'>,
    id: string,
    reason: string | null,
  ): Promise<MyAppointmentDto> {
    const { appointment, company, service } = await this.findOwned(user, id);
    if (appointment.status === 'CANCELLED') {
      return this.toDto(appointment, company, service);
    }
    if (appointment.startsAt.getTime() < Date.now()) {
      throw new BadRequestException('Não é possível cancelar agendamento no passado');
    }
    appointment.status = 'CANCELLED';
    appointment.cancelReason = reason ?? 'Cancelado pelo cliente';
    await this.appointments.save(appointment);
    await this.notifications.cancelScheduled(appointment.id);
    await this.notifications.enqueueImmediate(appointment.id, 'CANCELLED');
    return this.toDto(appointment, company, service);
  }

  async reschedule(
    user: Pick<User, 'id' | 'email' | 'phone'>,
    id: string,
    newStartIso: string,
  ): Promise<MyAppointmentDto> {
    const owned = await this.findOwned(user, id);
    const { appointment, company, service, customer } = owned;
    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Agendamento cancelado não pode ser remarcado');
    }
    if (appointment.startsAt.getTime() < Date.now()) {
      throw new BadRequestException('Agendamento passado não pode ser remarcado');
    }

    const newStartsAt = DateTime.fromISO(newStartIso, { zone: company.timezone });
    if (!newStartsAt.isValid) throw new BadRequestException('Data/hora inválida');
    if (newStartsAt < DateTime.now()) {
      throw new BadRequestException('Não é possível remarcar para o passado');
    }
    const newEndsAt = newStartsAt.plus({ minutes: service.durationMinutes });
    const date = newStartsAt.toISODate()!;

    const [hours, exceptions] = await Promise.all([
      this.hours.find({ where: { companyId: company.id } }),
      this.exceptions.find({ where: { companyId: company.id, date } }),
    ]);

    const slots = computeSlotsForDate({
      service,
      hours,
      exceptions,
      appointments: [],
      timezone: company.timezone,
      date,
    });
    const matches = slots.some(
      (s) => DateTime.fromISO(s.start).toMillis() === newStartsAt.toMillis(),
    );
    if (!matches) {
      throw new BadRequestException('Horário não disponível');
    }

    const created = await this.dataSource.transaction(async (manager) => {
      const apptRepo = manager.getRepository(Appointment);
      const conflicts = await apptRepo
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.companyId = :companyId', { companyId: company.id })
        .andWhere('a.serviceId = :serviceId', { serviceId: service.id })
        .andWhere('a.startsAt = :startsAt', { startsAt: newStartsAt.toJSDate() })
        .andWhere('a.status <> :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('a.deletedAt IS NULL')
        .andWhere('a.id <> :id', { id: appointment.id })
        .getCount();
      if (conflicts > 0) throw new ConflictException('Horário já reservado');

      appointment.status = 'CANCELLED';
      appointment.cancelReason = 'Remarcado pelo cliente';
      await apptRepo.save(appointment);

      const next = await apptRepo.save(
        apptRepo.create({
          companyId: company.id,
          serviceId: service.id,
          customerId: customer.id,
          startsAt: newStartsAt.toJSDate(),
          endsAt: newEndsAt.toJSDate(),
          status: 'PENDING',
        }),
      );
      return next;
    });

    await this.notifications.cancelScheduled(appointment.id);
    await this.notifications.enqueueImmediate(appointment.id, 'CANCELLED');
    await this.notifications.enqueueImmediate(created.id, 'CREATED');
    const r24 = new Date(created.startsAt.getTime() - 24 * 60 * 60 * 1000);
    const r1 = new Date(created.startsAt.getTime() - 60 * 60 * 1000);
    if (r24.getTime() > Date.now()) {
      await this.notifications.scheduleReminder(created.id, 'REMINDER_24H', r24);
    }
    if (r1.getTime() > Date.now()) {
      await this.notifications.scheduleReminder(created.id, 'REMINDER_1H', r1);
    }

    return this.toDto(created, company, service);
  }

  private toDto(appt: Appointment, company: Company, service: Service): MyAppointmentDto {
    return {
      id: appt.id,
      companyName: company.name,
      companySlug: company.slug,
      serviceId: service.id,
      serviceName: service.name,
      startsAt: appt.startsAt.toISOString(),
      endsAt: appt.endsAt.toISOString(),
      status: appt.status,
    };
  }

  private async findOwned(
    user: Pick<User, 'id' | 'email' | 'phone'>,
    appointmentId: string,
  ): Promise<OwnedAppointment> {
    const customerIds = await this.findCustomerIds(user);
    if (customerIds.length === 0) throw new NotFoundException('Agendamento não encontrado');

    const appointment = await this.appointments.findOne({
      where: { id: appointmentId, deletedAt: IsNull() },
      relations: { company: true, service: true, customer: true },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    if (!customerIds.includes(appointment.customerId)) {
      throw new ForbiddenException('Acesso negado');
    }
    return {
      appointment,
      company: appointment.company!,
      service: appointment.service!,
      customer: appointment.customer!,
    };
  }

  private async findCustomerIds(user: Pick<User, 'id' | 'email' | 'phone'>): Promise<string[]> {
    const qb = this.customers
      .createQueryBuilder('c')
      .where('c.deletedAt IS NULL')
      .andWhere(
        new Brackets((qb2) => {
          qb2.where('c.userId = :userId', { userId: user.id });
          if (user.email)
            qb2.orWhere('LOWER(c.email) = :email', { email: user.email.toLowerCase() });
          if (user.phone) qb2.orWhere('c.phone = :phone', { phone: user.phone });
        }),
      );
    const rows = await qb.select(['c.id']).getMany();
    return rows.map((r) => r.id);
  }
}
