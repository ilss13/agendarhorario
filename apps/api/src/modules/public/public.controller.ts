import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AppointmentDto,
  AvailabilityQuery,
  AvailabilityResponseDto,
  CreateAppointmentRequest,
  PublicCompanyDto,
  availabilityQuerySchema,
  createAppointmentRequestSchema,
} from '@agendarhorario/contracts';
import { Public } from '../auth/auth.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../availability/availability.service';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Service } from '../services/service.entity';

@Controller('public/companies')
export class PublicCompaniesController {
  constructor(
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(BusinessHour) private readonly hours: Repository<BusinessHour>,
    private readonly availability: AvailabilityService,
    private readonly appointments: AppointmentsService,
  ) {}

  @Public()
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string): Promise<PublicCompanyDto> {
    const company = await this.companies.findOne({ where: { slug } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    const [services, hours] = await Promise.all([
      this.services.find({
        where: { companyId: company.id, active: true },
        order: { name: 'ASC' },
      }),
      this.hours.find({
        where: { companyId: company.id },
        order: { dayOfWeek: 'ASC', startTime: 'ASC' },
      }),
    ]);
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      phone: company.phone,
      timezone: company.timezone,
      logoUrl: company.logoUrl,
      businessHours: hours.map((h) => ({
        id: h.id,
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
      })),
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes,
        price: Number(s.price),
      })),
    };
  }

  @Public()
  @Get(':slug/availability')
  async availabilityForSlug(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(availabilityQuerySchema)) query: AvailabilityQuery,
  ): Promise<AvailabilityResponseDto> {
    const company = await this.companies.findOne({ where: { slug } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    const days = await this.availability.getSlots({
      companyId: company.id,
      timezone: company.timezone,
      serviceId: query.serviceId,
      from: query.from,
      to: query.to,
    });
    return { serviceId: query.serviceId, days };
  }

  @Public()
  @Post(':slug/appointments')
  @HttpCode(HttpStatus.CREATED)
  createAppointment(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(createAppointmentRequestSchema)) input: CreateAppointmentRequest,
  ): Promise<AppointmentDto> {
    return this.appointments.createForPublicBooking(slug, input);
  }
}
