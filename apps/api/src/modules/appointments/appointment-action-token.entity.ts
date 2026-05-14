import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { Appointment } from './appointment.entity';

export type AppointmentActionKind = 'CONFIRM' | 'CANCEL' | 'RESCHEDULE';

@Entity({ name: 'appointment_action_tokens' })
@Index('ix_appt_action_tokens_token', ['tokenHash'], { unique: true })
export class AppointmentActionToken extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  appointmentId!: string;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment?: Appointment;

  @Column({ type: 'enum', enum: ['CONFIRM', 'CANCEL', 'RESCHEDULE'] })
  kind!: AppointmentActionKind;

  @Column({ type: 'varchar', length: 128 })
  tokenHash!: string;

  @Column({ type: 'datetime', precision: 6 })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  consumedAt!: Date | null;
}
