import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CompanyAppointmentsDto,
  CompanyAppointmentsQuery,
  companyAppointmentsQuerySchema,
} from '@agendarhorario/contracts';
import { CompanyScoped } from '../../shared/auth/company-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { CompanyAppointmentsService } from './company-appointments.service';

@ApiTags('company')
@CompanyScoped()
@Controller('company/appointments')
export class CompanyAppointmentsController {
  constructor(private readonly appointments: CompanyAppointmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os agendamentos da empresa em um dia',
    description:
      'Sessão por cookie. Papéis OWNER e STAFF. Status CONFIRMED indica que o cliente confirmou o horário.',
  })
  @ApiQuery({ name: 'date', required: true, example: '2026-09-23', description: 'AAAA-MM-DD' })
  @ApiResponse({
    status: 200,
    description: 'Agenda do dia',
    schema: {
      type: 'object',
      required: ['date', 'items'],
      properties: {
        date: { type: 'string', example: '2026-09-23' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'customerName',
              'customerPhone',
              'serviceName',
              'startsAt',
              'endsAt',
              'status',
            ],
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
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Data inválida' })
  @ApiResponse({ status: 401, description: 'Sessão ausente' })
  @ApiResponse({ status: 403, description: 'Papel sem acesso à empresa' })
  list(
    @Query(new ZodValidationPipe(companyAppointmentsQuerySchema))
    query: CompanyAppointmentsQuery,
  ): Promise<CompanyAppointmentsDto> {
    return this.appointments.listByDate(query.date);
  }
}
