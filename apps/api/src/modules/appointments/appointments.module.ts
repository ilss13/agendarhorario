import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityModule } from '../availability/availability.module';
import { BusinessException } from '../business-hours/business-exception.entity';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Service } from '../services/service.entity';
import { VerificationModule } from '../verification/verification.module';
import { AppointmentActionToken } from './appointment-action-token.entity';
import { AppointmentActionController } from './appointment-action.controller';
import { Appointment } from './appointment.entity';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentActionToken,
      Company,
      Service,
      Customer,
      BusinessHour,
      BusinessException,
    ]),
    AvailabilityModule,
    VerificationModule,
  ],
  controllers: [AppointmentActionController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
