import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'node:crypto';
import { Repository } from 'typeorm';
import type {
  ConfirmVerificationRequest,
  RequestVerificationRequest,
  VerificationChannel,
  VerificationTokenResponse,
} from '@agendarhorario/contracts';
import {
  EMAIL_PROVIDER,
  EmailProvider,
  SMS_PROVIDER,
  SmsProvider,
} from '../notifications/notification.types';
import { Verification } from './verification.entity';

export interface VerificationTokenPayload {
  channel: VerificationChannel;
  target: string;
  /** Issued at unix seconds */
  iat?: number;
  /** Expires at unix seconds */
  exp?: number;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(Verification) private readonly repo: Repository<Verification>,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async request(input: RequestVerificationRequest): Promise<{ target: string }> {
    const target = input.channel === 'EMAIL' ? input.email!.toLowerCase() : input.phone!;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const ttlMin = this.config.get<number>('VERIFICATION_OTP_TTL_MINUTES') ?? 10;
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    await this.repo.save(
      this.repo.create({
        type: input.channel,
        target,
        codeHash: hashCode(code, target),
        expiresAt,
        attempts: 0,
      }),
    );

    if (input.channel === 'EMAIL') {
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

    return { target };
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
}

const hashCode = (code: string, target: string): string =>
  createHash('sha256').update(`${target}:${code}`).digest('hex');
