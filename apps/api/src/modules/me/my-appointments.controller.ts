import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  CancelRequest,
  MyAppointmentDto,
  MyAppointmentsQuery,
  RescheduleRequest,
  cancelRequestSchema,
  myAppointmentsQuerySchema,
  rescheduleRequestSchema,
} from '@agendarhorario/contracts';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MyAppointmentsService } from './my-appointments.service';

@Controller('me/appointments')
export class MyAppointmentsController {
  constructor(private readonly service: MyAppointmentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(myAppointmentsQuerySchema)) query: MyAppointmentsQuery,
  ) {
    return this.service.list(user, query);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MyAppointmentDto> {
    return this.service.getById(user, id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(cancelRequestSchema)) body: CancelRequest,
  ): Promise<MyAppointmentDto> {
    return this.service.cancel(user, id, body.reason ?? null);
  }

  @Patch(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(rescheduleRequestSchema)) body: RescheduleRequest,
  ): Promise<MyAppointmentDto> {
    return this.service.reschedule(user, id, body.startsAt);
  }
}
