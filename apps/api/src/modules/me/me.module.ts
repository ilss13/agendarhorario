import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { BusinessException } from '../business-hours/business-exception.entity';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Service } from '../services/service.entity';
import { User } from '../users/user.entity';
import { Verification } from '../verification/verification.entity';
import { MeAccountController } from './me-account.controller';
import { MeAccountService } from './me-account.service';
import { MyAppointmentsController } from './my-appointments.controller';
import { MyAppointmentsService } from './my-appointments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      Customer,
      Company,
      Service,
      BusinessHour,
      BusinessException,
      User,
      Verification,
    ]),
  ],
  controllers: [MyAppointmentsController, MeAccountController],
  providers: [MyAppointmentsService, MeAccountService],
})
export class MeModule {}
