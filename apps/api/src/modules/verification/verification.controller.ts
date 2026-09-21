import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ConfirmVerificationRequest,
  RequestVerificationRequest,
  RequestVerificationResponse,
  VerificationTokenResponse,
  confirmVerificationSchema,
  requestVerificationSchema,
} from '@agendarhorario/contracts';
import { Public } from '../auth/auth.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { VerificationService } from './verification.service';

@Controller('public/verification')
export class VerificationController {
  constructor(
    private readonly service: VerificationService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('request')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  request(
    @Body(new ZodValidationPipe(requestVerificationSchema)) input: RequestVerificationRequest,
  ): Promise<RequestVerificationResponse> {
    return this.service.request(input);
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

  /** Consulta temporária do OTP em Redis (indisponível em produção). */
  @Public()
  @Get('dev-otp')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async lookupDevOtp(
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ): Promise<{ code: string; channel: string; email: string; phone: string }> {
    const env = this.config.get<string>('nodeEnv') ?? this.config.get<string>('NODE_ENV');
    if (env === 'production') {
      throw new NotFoundException();
    }
    return this.service.lookupDevOtp({ email, phone });
  }
}
