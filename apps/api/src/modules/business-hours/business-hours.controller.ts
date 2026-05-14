import { Body, Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import {
  BusinessHourDto,
  ReplaceBusinessHoursRequest,
  replaceBusinessHoursRequestSchema,
} from '@agendarhorario/contracts';
import { CompanyScoped } from '../../shared/auth/company-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { BusinessHoursService } from './business-hours.service';

@CompanyScoped()
@Controller('company/business-hours')
export class BusinessHoursController {
  constructor(private readonly service: BusinessHoursService) {}

  @Get()
  list(): Promise<BusinessHourDto[]> {
    return this.service.list();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  replace(
    @Body(new ZodValidationPipe(replaceBusinessHoursRequestSchema))
    input: ReplaceBusinessHoursRequest,
  ): Promise<BusinessHourDto[]> {
    return this.service.replace(input);
  }
}
