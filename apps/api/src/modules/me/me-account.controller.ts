import { Controller, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DataExportDto, MeAccountService } from './me-account.service';

@Controller('me')
export class MeAccountController {
  constructor(private readonly service: MeAccountService) {}

  @Get('data-export')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  export(@CurrentUser() user: AuthenticatedUser): Promise<DataExportDto> {
    return this.service.export(user);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  async delete(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.service.deleteAccount(user);
  }
}
