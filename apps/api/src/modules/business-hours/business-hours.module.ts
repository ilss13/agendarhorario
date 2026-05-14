import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessException } from './business-exception.entity';
import { BusinessExceptionsController } from './business-exceptions.controller';
import { BusinessExceptionsService } from './business-exceptions.service';
import { BusinessHour } from './business-hour.entity';
import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessHour, BusinessException])],
  controllers: [BusinessHoursController, BusinessExceptionsController],
  providers: [BusinessHoursService, BusinessExceptionsService],
  exports: [BusinessHoursService, BusinessExceptionsService],
})
export class BusinessHoursModule {}
