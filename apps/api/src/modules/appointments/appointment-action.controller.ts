import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ActionKind, ActionPreviewDto, ActionResultDto } from '@agendarhorario/contracts';
import { Public } from '../auth/auth.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { AppointmentActionService } from './appointment-action.service';

const confirmBodySchema = z.object({ kind: z.enum(['CONFIRM', 'CANCEL']) });
type ConfirmBody = z.infer<typeof confirmBodySchema>;

@Controller('public/appointments/action')
export class AppointmentActionController {
  constructor(private readonly actions: AppointmentActionService) {}

  @Public()
  @Get(':token')
  async preview(@Param('token') token: string): Promise<ActionPreviewDto> {
    const { appointment, kind, consumed } = await this.actions.preview(token);
    return {
      kind: kind as ActionKind,
      alreadyConsumed: consumed,
      appointment: {
        id: appointment.id,
        serviceName: appointment.service?.name ?? '',
        companyName: appointment.company?.name ?? '',
        customerName: appointment.customer?.name ?? '',
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: appointment.status,
      },
    };
  }

  @Public()
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(confirmBodySchema)) _body: ConfirmBody,
  ): Promise<ActionResultDto> {
    const appointment = await this.actions.consume(token);
    return { status: appointment.status };
  }
}
