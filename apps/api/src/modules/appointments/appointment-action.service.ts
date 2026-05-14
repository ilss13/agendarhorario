import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AppointmentActionKind, AppointmentActionToken } from './appointment-action-token.entity';
import { Appointment } from './appointment.entity';

export interface ActionLink {
  kind: AppointmentActionKind;
  url: string;
  token: string;
  expiresAt: Date;
}

interface TokenPayload {
  appointmentId: string;
  kind: AppointmentActionKind;
  nonce: string;
}

@Injectable()
export class AppointmentActionService {
  constructor(
    @InjectRepository(AppointmentActionToken)
    private readonly tokens: Repository<AppointmentActionToken>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /** Cria (ou reutiliza) tokens de confirm/cancel para um appointment. */
  async issueLinks(
    appointmentId: string,
    kinds: AppointmentActionKind[] = ['CONFIRM', 'CANCEL'],
  ): Promise<ActionLink[]> {
    const ttlHours = this.config.get<number>('APPOINTMENT_ACTION_TOKEN_TTL_HOURS') ?? 72;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:4200';
    const secret = this.config.getOrThrow<string>('VERIFICATION_JWT_SECRET');

    const links: ActionLink[] = [];
    for (const kind of kinds) {
      const nonce = randomBytes(16).toString('hex');
      const payload: TokenPayload = { appointmentId, kind, nonce };
      const token = await this.jwt.signAsync(payload, { secret, expiresIn: `${ttlHours}h` });
      const tokenHash = hash(token);
      await this.tokens.save(this.tokens.create({ appointmentId, kind, tokenHash, expiresAt }));
      links.push({
        kind,
        token,
        expiresAt,
        url: `${webOrigin}/a/${token}`,
      });
    }
    return links;
  }

  async preview(token: string): Promise<{
    appointment: Appointment;
    kind: AppointmentActionKind;
    consumed: boolean;
  }> {
    const payload = await this.decode(token);
    const record = await this.findActiveRecord(token, payload.kind);
    const appointment = await this.appointments.findOne({
      where: { id: payload.appointmentId },
      relations: { service: true, customer: true, company: true },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return { appointment, kind: payload.kind, consumed: !!record.consumedAt };
  }

  async consume(token: string): Promise<Appointment> {
    const payload = await this.decode(token);
    return this.dataSource.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(AppointmentActionToken);
      const record = await tokenRepo.findOne({
        where: { tokenHash: hash(token), kind: payload.kind },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) throw new NotFoundException('Link inválido');
      if (record.consumedAt) throw new BadRequestException('Link já utilizado');
      if (record.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException('Link expirado');
      }
      const apptRepo = manager.getRepository(Appointment);
      const appointment = await apptRepo.findOne({
        where: { id: payload.appointmentId },
      });
      if (!appointment) throw new NotFoundException('Agendamento não encontrado');

      if (payload.kind === 'CONFIRM') {
        if (appointment.status === 'CANCELLED') {
          throw new BadRequestException('Agendamento já foi cancelado');
        }
        appointment.status = 'CONFIRMED';
      } else if (payload.kind === 'CANCEL') {
        if (appointment.status === 'CANCELLED') {
          // idempotente
        } else {
          appointment.status = 'CANCELLED';
          appointment.cancelReason = 'Cancelado pelo cliente via link';
        }
      } else {
        throw new BadRequestException('Tipo de ação não suportado nesta rota');
      }
      await apptRepo.save(appointment);

      record.consumedAt = new Date();
      await tokenRepo.save(record);
      return appointment;
    });
  }

  private async decode(token: string): Promise<TokenPayload> {
    try {
      const secret = this.config.getOrThrow<string>('VERIFICATION_JWT_SECRET');
      return await this.jwt.verifyAsync<TokenPayload>(token, { secret });
    } catch {
      throw new BadRequestException('Link inválido ou expirado');
    }
  }

  private async findActiveRecord(
    token: string,
    kind: AppointmentActionKind,
  ): Promise<AppointmentActionToken> {
    const record = await this.tokens.findOne({
      where: { tokenHash: hash(token), kind, deletedAt: IsNull() },
    });
    if (!record) throw new NotFoundException('Link inválido');
    return record;
  }
}

const hash = (token: string): string => createHash('sha256').update(token).digest('hex');
