import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  CreateServiceRequest,
  PaginatedResult,
  PaginationQuery,
  ServiceDto,
  UpdateServiceRequest,
  createServiceRequestSchema,
  paginationQuerySchema,
  updateServiceRequestSchema,
} from '@agendarhorario/contracts';
import { CompanyScoped } from '../../shared/auth/company-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { ServicesService } from './services.service';

@CompanyScoped()
@Controller('company/services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ): Promise<PaginatedResult<ServiceDto>> {
    return this.services.list(query);
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string): Promise<ServiceDto> {
    return this.services.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createServiceRequestSchema))
  create(@Body() input: CreateServiceRequest): Promise<ServiceDto> {
    return this.services.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateServiceRequestSchema)) input: UpdateServiceRequest,
  ): Promise<ServiceDto> {
    return this.services.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.services.remove(id);
  }
}
