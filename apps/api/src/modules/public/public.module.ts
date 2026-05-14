import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Service } from '../services/service.entity';
import { PublicCompaniesController } from './public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Service, BusinessHour]),
    AvailabilityModule,
    AppointmentsModule,
  ],
  controllers: [PublicCompaniesController],
})
export class PublicModule {}
