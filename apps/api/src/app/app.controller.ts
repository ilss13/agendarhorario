import { Controller, Get } from '@nestjs/common';
import { Public } from '../modules/auth/auth.guard';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health(): { status: 'ok'; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
