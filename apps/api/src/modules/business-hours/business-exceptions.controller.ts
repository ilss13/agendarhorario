import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  BusinessExceptionDto,
  BusinessExceptionInput,
  businessExceptionInputSchema,
} from '@agendarhorario/contracts';
import { CompanyScoped } from '../../shared/auth/company-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { BusinessExceptionsService } from './business-exceptions.service';

const listQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
type ListQuery = z.infer<typeof listQuerySchema>;

@CompanyScoped()
@Controller('company/business-exceptions')
export class BusinessExceptionsController {
  constructor(private readonly service: BusinessExceptionsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ): Promise<BusinessExceptionDto[]> {
    return this.service.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(businessExceptionInputSchema)) input: BusinessExceptionInput,
  ): Promise<BusinessExceptionDto> {
    return this.service.create(input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
