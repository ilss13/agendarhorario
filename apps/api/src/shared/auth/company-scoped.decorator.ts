import { UseGuards, applyDecorators } from '@nestjs/common';
import { Roles, RolesGuard } from './roles.guard';

/** Marca o controller como restrito a OWNER/STAFF da empresa logada. */
export const CompanyScoped = (): ClassDecorator =>
  applyDecorators(Roles('OWNER', 'STAFF'), UseGuards(RolesGuard));
