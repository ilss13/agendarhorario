import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CompanyAppointmentsDto,
  CompanyAppointmentsMonthDto,
  CompanyAppointmentsQuery,
  companyAppointmentsQuerySchema,
} from '@agendarhorario/contracts';
import { CompanyScoped } from '../../shared/auth/company-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { CompanyAppointmentsService } from './company-appointments.service';

const appointmentItemSchema = {
  type: 'object',
  required: ['id', 'customerName', 'customerPhone', 'serviceName', 'startsAt', 'endsAt', 'status'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    customerName: { type: 'string' },
    customerPhone: { type: 'string', nullable: true },
    serviceName: { type: 'string' },
    startsAt: { type: 'string' },
    endsAt: { type: 'string' },
    status: {
      type: 'string',
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
    },
  },
};

@ApiTags('company')
@CompanyScoped()
@Controller('company/appointments')
export class CompanyAppointmentsController {
  constructor(private readonly appointments: CompanyAppointmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os agendamentos da empresa em um dia ou em um mês',
    description:
      'Sessão por cookie. Papéis OWNER e STAFF. Informe date ou month, nunca os dois. Status CONFIRMED indica que o cliente confirmou o horário.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2026-09-23',
    description: 'AAAA-MM-DD. Obrigatório se month não for enviado.',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    example: '2026-09',
    description: 'AAAA-MM. Obrigatório se date não for enviado. Devolve o mês inteiro.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agenda do dia (date + items) ou do mês (month + items)',
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['date', 'items'],
          properties: {
            date: { type: 'string', example: '2026-09-23' },
            items: { type: 'array', items: appointmentItemSchema },
          },
        },
        {
          type: 'object',
          required: ['month', 'items'],
          properties: {
            month: { type: 'string', example: '2026-09' },
            items: { type: 'array', items: appointmentItemSchema },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Data ou mês inválido' })
  @ApiResponse({ status: 401, description: 'Sessão ausente' })
  @ApiResponse({ status: 403, description: 'Papel sem acesso à empresa' })
  list(
    @Query(new ZodValidationPipe(companyAppointmentsQuerySchema))
    query: CompanyAppointmentsQuery,
  ): Promise<CompanyAppointmentsDto | CompanyAppointmentsMonthDto> {
    if (query.month && !query.date) return this.appointments.listByMonth(query.month);
    if (query.date && !query.month) return this.appointments.listByDate(query.date);
    throw new BadRequestException('Informe a data ou o mês');
  }
}
