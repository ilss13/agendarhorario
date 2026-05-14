import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ConfirmVerificationRequest,
  RequestVerificationRequest,
  VerificationTokenResponse,
  confirmVerificationSchema,
  requestVerificationSchema,
} from '@agendarhorario/contracts';
import { Public } from '../auth/auth.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { VerificationService } from './verification.service';

@Controller('public/verification')
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @Public()
  @Post('request')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async request(
    @Body(new ZodValidationPipe(requestVerificationSchema)) input: RequestVerificationRequest,
  ): Promise<void> {
    await this.service.request(input);
  }

  @Public()
  @Post('confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  confirm(
    @Body(new ZodValidationPipe(confirmVerificationSchema)) input: ConfirmVerificationRequest,
  ): Promise<VerificationTokenResponse> {
    return this.service.confirm(input);
  }
}
