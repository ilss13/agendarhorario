import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ActionKind, ActionPreviewDto, ActionResultDto } from '@agendarhorario/contracts';
import { Public } from '../auth/auth.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { AppointmentActionService } from './appointment-action.service';

const confirmBodySchema = z.object({ kind: z.enum(['CONFIRM', 'CANCEL']) });
type ConfirmBody = z.infer<typeof confirmBodySchema>;

const appointmentStatusEnum = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];

@ApiTags('public')
@Controller('public/appointments/action')
export class AppointmentActionController {
  constructor(private readonly actions: AppointmentActionService) {}

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Pré-visualiza o agendamento de um link de confirmação ou cancelamento',
  })
  @ApiParam({ name: 'token', description: 'JWT de ação enviado na notificação' })
  @ApiResponse({
    status: 200,
    description: 'Dados do agendamento e validade do link',
    schema: {
      type: 'object',
      required: ['kind', 'alreadyConsumed', 'expiresAt', 'appointment'],
      properties: {
        kind: { type: 'string', enum: ['CONFIRM', 'CANCEL'] },
        alreadyConsumed: { type: 'boolean' },
        expiresAt: { type: 'string' },
        appointment: {
          type: 'object',
          required: [
            'id',
            'serviceName',
            'companyName',
            'companyPhone',
            'logoUrl',
            'customerName',
            'durationMinutes',
            'price',
            'startsAt',
            'endsAt',
            'status',
          ],
          properties: {
            id: { type: 'string', format: 'uuid' },
            serviceName: { type: 'string' },
            companyName: { type: 'string' },
            companyPhone: { type: 'string', nullable: true },
            logoUrl: { type: 'string', nullable: true },
            customerName: { type: 'string' },
            durationMinutes: { type: 'integer', minimum: 0 },
            price: { type: 'number', minimum: 0 },
            startsAt: { type: 'string' },
            endsAt: { type: 'string' },
            status: { type: 'string', enum: appointmentStatusEnum },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Link inválido ou expirado' })
  @ApiResponse({ status: 404, description: 'Link ou agendamento não encontrado' })
  async preview(@Param('token') token: string): Promise<ActionPreviewDto> {
    const { appointment, kind, consumed, expiresAt } = await this.actions.preview(token);
    return {
      kind: kind as ActionKind,
      alreadyConsumed: consumed,
      expiresAt: expiresAt.toISOString(),
      appointment: {
        id: appointment.id,
        serviceName: appointment.service?.name ?? '',
        companyName: appointment.company?.name ?? '',
        companyPhone: appointment.company?.phone ?? null,
        logoUrl: appointment.company?.logoUrl ?? null,
        customerName: appointment.customer?.name ?? '',
        durationMinutes: appointment.service?.durationMinutes ?? 0,
        price: appointment.service?.price ?? 0,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: appointment.status,
      },
    };
  }

  @Public()
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma ou cancela o agendamento pelo link da notificação',
    description:
      'Um link de confirmação aceita CONFIRM ou CANCEL. Um link de cancelamento aceita só CANCEL. O token é de uso único.',
  })
  @ApiParam({ name: 'token', description: 'JWT de ação enviado na notificação' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['kind'],
      properties: { kind: { type: 'string', enum: ['CONFIRM', 'CANCEL'] } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status do agendamento após a ação',
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: appointmentStatusEnum } },
    },
  })
  @ApiResponse({ status: 400, description: 'Link usado, expirado ou ação não permitida' })
  @ApiResponse({ status: 404, description: 'Link ou agendamento não encontrado' })
  async confirm(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(confirmBodySchema)) body: ConfirmBody,
  ): Promise<ActionResultDto> {
    const appointment = await this.actions.consume(token, body.kind);
    return { status: appointment.status };
  }
}
