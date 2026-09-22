import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../modules/auth/auth.guard';

@ApiTags('observability')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  health(): { status: 'ok'; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Public()
  @Get('debug-sentry')
  @ApiOperation({ summary: 'Dispara um erro 500 para validar o Sentry' })
  @ApiResponse({ status: 500, description: 'Erro proposital' })
  getError(): never {
    throw new Error('My first Sentry error!');
  }
}
