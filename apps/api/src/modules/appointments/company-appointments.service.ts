import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import type {
  CompanyAppointmentDto,
  CompanyAppointmentsDto,
  CompanyAppointmentsMonthDto,
} from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { Appointment } from './appointment.entity';
import { appointmentDayRange, appointmentMonthRange } from './company-appointments.range';

@Injectable()
export class CompanyAppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    private readonly tenant: TenantContextService,
  ) {}

  async listByDate(date: string): Promise<CompanyAppointmentsDto> {
    const companyId = this.tenant.requireCompanyId();
    const { start, end } = appointmentDayRange(date);
    const rows = await this.appointments.find({
      where: { companyId, startsAt: Between(start, end) },
      relations: { customer: true, service: true },
      order: { startsAt: 'ASC' },
    });
    return {
      date,
      items: rows.map(toDto),
    };
  }

  async listByMonth(month: string): Promise<CompanyAppointmentsMonthDto> {
    const companyId = this.tenant.requireCompanyId();
    const { start, end } = appointmentMonthRange(month);
    const rows = await this.appointments.find({
      where: { companyId, startsAt: Between(start, end) },
      relations: { customer: true, service: true },
      order: { startsAt: 'ASC' },
    });
    return {
      month,
      items: rows.map(toDto),
    };
  }
}

const toDto = (appointment: Appointment): CompanyAppointmentDto => ({
  id: appointment.id,
  customerName: appointment.customer?.name ?? '',
  customerPhone: appointment.customer?.phone ?? null,
  serviceName: appointment.service?.name ?? '',
  startsAt: appointment.startsAt.toISOString(),
  endsAt: appointment.endsAt.toISOString(),
  status: appointment.status,
});
