import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  CompanyDto,
  UpdateCompanyRequest,
  updateCompanyRequestSchema,
} from '@agendarhorario/contracts';
import { CompanyScoped } from '../../shared/auth/company-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { CompaniesService } from './companies.service';

@CompanyScoped()
@Controller('company')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  getMine(): Promise<CompanyDto> {
    return this.companies.getMine();
  }

  @Patch()
  update(
    @Body(new ZodValidationPipe(updateCompanyRequestSchema)) input: UpdateCompanyRequest,
  ): Promise<CompanyDto> {
    return this.companies.updateMine(input);
  }
}
