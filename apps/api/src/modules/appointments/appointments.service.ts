import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Between, DataSource, IsNull, Not, Repository } from 'typeorm';
import type { AppointmentDto, CreateAppointmentRequest } from '@agendarhorario/contracts';
import { computeSlotsForDate, occupiedRangesOverlap } from '../availability/availability.service';
import { BusinessException } from '../business-hours/business-exception.entity';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Service } from '../services/service.entity';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VerificationService } from '../verification/verification.service';
import { Appointment, AppointmentStatus } from './appointment.entity';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(BusinessHour) private readonly hours: Repository<BusinessHour>,
    @InjectRepository(BusinessException)
    private readonly exceptions: Repository<BusinessException>,
    private readonly verification: VerificationService,
    private readonly notifications: NotificationsService,
    private readonly billing: BillingService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async createForPublicBooking(
    slug: string,
    input: CreateAppointmentRequest,
  ): Promise<AppointmentDto> {
    const company = await this.companies.findOne({ where: { slug } });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const billingCheck = await this.billing.canBookForCompany(company.id);
    if (billingCheck.state === 'NO_SUBSCRIPTION' || billingCheck.state === 'SUSPENDED') {
      throw new BadRequestException(
        'Esta empresa está com a página de agendamentos indisponível no momento.',
      );
    }
    if (billingCheck.state === 'OVER_LIMIT') {
      throw new BadRequestException(
        'Esta empresa atingiu o limite de agendamentos deste mês. Tente novamente após a renovação.',
      );
    }

    const service = await this.services.findOne({
      where: { id: input.serviceId, companyId: company.id, active: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');

    let verifiedEmail: string | undefined;
    let verifiedPhone: string | undefined;
    if (input.verificationToken) {
      const payload = await this.verification.verifyToken(input.verificationToken);
      if (payload.channel === 'EMAIL') verifiedEmail = payload.target;
      else verifiedPhone = payload.target;
    }

    if (!input.customer.email || !input.customer.phone) {
      throw new BadRequestException('Informe e-mail e telefone do cliente');
    }
    if (
      input.customer.email &&
      verifiedEmail &&
      input.customer.email.toLowerCase() !== verifiedEmail
    ) {
      throw new BadRequestException('E-mail não corresponde ao verificado');
    }
    if (input.customer.phone && verifiedPhone && input.customer.phone !== verifiedPhone) {
      throw new BadRequestException('Telefone não corresponde ao verificado');
    }
    if (!verifiedEmail && !verifiedPhone) {
      throw new BadRequestException('Verificação obrigatória para agendamento sem login');
    }

    const startsAt = DateTime.fromISO(input.startsAt, { zone: company.timezone });
    if (!startsAt.isValid) throw new BadRequestException('Data/hora inválida');
    if (startsAt < DateTime.now()) {
      throw new BadRequestException('Não é possível agendar no passado');
    }
    const endsAt = startsAt.plus({ minutes: service.durationMinutes });

    const date = startsAt.toISODate()!;
    const dayStart = startsAt.startOf('day').toJSDate();
    const dayEnd = startsAt.endOf('day').toJSDate();
    const hours = await this.hours.find({ where: { companyId: company.id } });
    const exceptions = await this.exceptions.find({
      where: { companyId: company.id, date },
    });
    const dayAppointments = await this.appointments.find({
      where: {
        companyId: company.id,
        serviceId: service.id,
        startsAt: Between(dayStart, dayEnd),
        status: Not('CANCELLED'),
        deletedAt: IsNull(),
      },
    });

    const slots = computeSlotsForDate({
      service,
      hours,
      exceptions,
      appointments: dayAppointments,
      timezone: company.timezone,
      date,
    });
    const matches = slots.some((s) => DateTime.fromISO(s.start).toMillis() === startsAt.toMillis());
    if (!matches) {
      throw new BadRequestException('Horário não corresponde a um slot válido');
    }

    const bufferMinutes = service.bufferMinutes ?? 0;
    const created = await this.dataSource.transaction(async (manager) => {
      const lockingApptRepo = manager.getRepository(Appointment);
      const locked = await lockingApptRepo
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.companyId = :companyId', { companyId: company.id })
        .andWhere('a.serviceId = :serviceId', { serviceId: service.id })
        .andWhere('a.startsAt < :dayEnd', { dayEnd })
        .andWhere('a.endsAt > :dayStart', { dayStart })
        .andWhere('a.status <> :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('a.deletedAt IS NULL')
        .getMany();
      const overlap = locked.some((a) =>
        occupiedRangesOverlap(a, startsAt, endsAt, bufferMinutes, company.timezone),
      );
      if (overlap) {
        throw new ConflictException('Horário não está mais disponível');
      }

      const customerRepo = manager.getRepository(Customer);
      let customer: Customer | null = null;
      if (verifiedEmail) {
        customer = await customerRepo.findOne({
          where: { companyId: company.id, email: verifiedEmail },
        });
      }
      if (!customer && verifiedPhone) {
        customer = await customerRepo.findOne({
          where: { companyId: company.id, phone: verifiedPhone },
        });
      }
      if (!customer) {
        customer = await customerRepo.save(
          customerRepo.create({
            companyId: company.id,
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone,
            notes: input.customer.notes ?? null,
          }),
        );
      } else {
        customer.name = input.customer.name;
        if (input.customer.notes !== undefined) customer.notes = input.customer.notes;
        customer.email = input.customer.email;
        customer.phone = input.customer.phone;
        customer = await customerRepo.save(customer);
      }

      const appointmentRepo = manager.getRepository(Appointment);
      const status: AppointmentStatus = 'PENDING';
      const appointment = await appointmentRepo.save(
        appointmentRepo.create({
          companyId: company.id,
          serviceId: service.id,
          customerId: customer.id,
          startsAt: startsAt.toJSDate(),
          endsAt: endsAt.toJSDate(),
          status,
        }),
      );

      return {
        id: appointment.id,
        serviceId: service.id,
        serviceName: service.name,
        customerName: customer.name,
        startsAt: startsAt.toISO()!,
        endsAt: endsAt.toISO()!,
        status,
      };
    });

    try {
      await this.enqueueAfterCreate(created.id, startsAt.toJSDate());
    } catch (err) {
      this.logger.error(
        `Falha ao enfileirar notificações do agendamento ${created.id}: ${(err as Error).message}`,
      );
    }
    return created;
  }

  private async enqueueAfterCreate(appointmentId: string, startsAt: Date): Promise<void> {
    await this.notifications.enqueueImmediate(appointmentId, 'CREATED');
    const reminder24 = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
    const reminder1 = new Date(startsAt.getTime() - 60 * 60 * 1000);
    if (reminder24.getTime() > Date.now()) {
      await this.notifications.scheduleReminder(appointmentId, 'REMINDER_24H', reminder24);
    }
    if (reminder1.getTime() > Date.now()) {
      await this.notifications.scheduleReminder(appointmentId, 'REMINDER_1H', reminder1);
    }
  }
}
