import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'node:crypto';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';
import type {
  ConfirmVerificationRequest,
  RequestVerificationRequest,
  RequestVerificationResponse,
  VerificationChannel,
  VerificationTokenResponse,
} from '@agendarhorario/contracts';
import {
  EMAIL_PROVIDER,
  EmailProvider,
  SMS_PROVIDER,
  SmsProvider,
} from '../notifications/notification.types';
import { REDIS_CLIENT, otpLookupKey } from '../../shared/infra/redis/redis.constants';
import { Verification } from './verification.entity';

export interface VerificationTokenPayload {
  channel: VerificationChannel;
  target: string;
  /** Issued at unix seconds */
  iat?: number;
  /** Expires at unix seconds */
  exp?: number;
}

interface DevOtpRecord {
  code: string;
  channel: VerificationChannel;
  email: string;
  phone: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(Verification) private readonly repo: Repository<Verification>,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async request(input: RequestVerificationRequest): Promise<RequestVerificationResponse> {
    const email = input.email.toLowerCase();
    const phone = input.phone;
    const channel = this.resolveDeliveryChannel();
    const target = channel === 'EMAIL' ? email : phone;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const ttlMin = this.config.get<number>('VERIFICATION_OTP_TTL_MINUTES') ?? 10;
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    await this.repo.save(
      this.repo.create({
        type: channel,
        target,
        codeHash: hashCode(code, target),
        expiresAt,
        attempts: 0,
      }),
    );

    await this.storeDevOtp({ code, channel, email, phone }, ttlMin * 60);

    if (channel === 'EMAIL') {
      await this.email.send({
        to: target,
        subject: 'Seu código de verificação',
        text: `Seu código é ${code}. Ele expira em ${ttlMin} minutos.`,
        html: `<p>Seu código é <strong>${code}</strong>.</p><p>Ele expira em ${ttlMin} minutos.</p>`,
      });
    } else {
      await this.sms.send({
        to: target,
        body: `Agendar Horário: seu código é ${code}. Expira em ${ttlMin} min.`,
      });
    }

    return { channel, target };
  }

  async confirm(input: ConfirmVerificationRequest): Promise<VerificationTokenResponse> {
    const normalizedTarget = input.channel === 'EMAIL' ? input.target.toLowerCase() : input.target;
    const verification = await this.repo
      .createQueryBuilder('v')
      .where('v.type = :type', { type: input.channel })
      .andWhere('v.target = :target', { target: normalizedTarget })
      .andWhere('v.consumedAt IS NULL')
      .orderBy('v.createdAt', 'DESC')
      .getOne();

    if (!verification) {
      throw new BadRequestException('Nenhum código pendente. Solicite um novo.');
    }
    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Código expirado. Solicite um novo.');
    }
    const maxAttempts = this.config.get<number>('VERIFICATION_MAX_ATTEMPTS') ?? 5;
    if (verification.attempts >= maxAttempts) {
      throw new BadRequestException('Muitas tentativas. Solicite um novo código.');
    }

    if (verification.codeHash !== hashCode(input.code, normalizedTarget)) {
      verification.attempts += 1;
      await this.repo.save(verification);
      throw new UnauthorizedException('Código inválido');
    }

    verification.consumedAt = new Date();
    await this.repo.save(verification);
    await this.clearDevOtp(normalizedTarget, input.channel);

    const tokenTtlMin = this.config.get<number>('VERIFICATION_TOKEN_TTL_MINUTES') ?? 15;
    const payload: VerificationTokenPayload = {
      channel: input.channel,
      target: normalizedTarget,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('VERIFICATION_JWT_SECRET'),
      expiresIn: `${tokenTtlMin}m`,
    });
    const expiresAt = new Date(Date.now() + tokenTtlMin * 60 * 1000);

    return {
      verificationToken: token,
      channel: input.channel,
      target: normalizedTarget,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async lookupDevOtp(query: { email?: string; phone?: string }): Promise<DevOtpRecord> {
    if (this.isProduction()) {
      throw new NotFoundException();
    }
    const email = query.email?.trim().toLowerCase();
    const phone = query.phone?.trim();
    if (!email && !phone) {
      throw new BadRequestException('Informe e-mail ou telefone para consultar o código');
    }
    const raw = email
      ? await this.redis.get(otpLookupKey('email', email))
      : phone
        ? await this.redis.get(otpLookupKey('phone', phone))
        : null;
    if (!raw) {
      throw new NotFoundException('Nenhum código temporário encontrado para este contato');
    }
    return JSON.parse(raw) as DevOtpRecord;
  }

  async verifyToken(token: string): Promise<VerificationTokenPayload> {
    try {
      return await this.jwt.verifyAsync<VerificationTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('VERIFICATION_JWT_SECRET'),
      });
    } catch (err) {
      this.logger.debug(`Verification token inválido: ${(err as Error).message}`);
      throw new UnauthorizedException('Token de verificação inválido ou expirado');
    }
  }

  private resolveDeliveryChannel(): VerificationChannel {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.config.get<string>('TWILIO_SMS_FROM');
    if (sid && token && from) {
      return 'SMS';
    }
    return 'EMAIL';
  }

  private isProduction(): boolean {
    const env = this.config.get<string>('nodeEnv') ?? this.config.get<string>('NODE_ENV');
    return env === 'production';
  }

  private async storeDevOtp(record: DevOtpRecord, ttlSeconds: number): Promise<void> {
    if (this.isProduction()) return;
    const payload = JSON.stringify(record);
    try {
      await this.redis.set(otpLookupKey('email', record.email), payload, 'EX', ttlSeconds);
      await this.redis.set(otpLookupKey('phone', record.phone), payload, 'EX', ttlSeconds);
      this.logger.debug(
        `OTP de teste gravado no Redis (otp:dev:email:${record.email} / otp:dev:phone:${record.phone})`,
      );
    } catch (err) {
      this.logger.warn(`Falha ao gravar OTP de teste no Redis: ${(err as Error).message}`);
    }
  }

  private async clearDevOtp(target: string, channel: VerificationChannel): Promise<void> {
    if (this.isProduction()) return;
    try {
      const kind = channel === 'EMAIL' ? 'email' : 'phone';
      const raw = await this.redis.get(otpLookupKey(kind, target));
      if (!raw) return;
      const record = JSON.parse(raw) as DevOtpRecord;
      await this.redis.del(
        otpLookupKey('email', record.email),
        otpLookupKey('phone', record.phone),
      );
    } catch (err) {
      this.logger.warn(`Falha ao limpar OTP de teste no Redis: ${(err as Error).message}`);
    }
  }
}

const hashCode = (code: string, target: string): string =>
  createHash('sha256').update(`${target}:${code}`).digest('hex');
