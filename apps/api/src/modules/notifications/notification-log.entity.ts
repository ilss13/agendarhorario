import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { Appointment } from '../appointments/appointment.entity';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';
export type NotificationKind =
  | 'CREATED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REMINDER_24H'
  | 'REMINDER_1H';
export type NotificationStatus = 'SENT' | 'FAILED' | 'SKIPPED';

@Entity({ name: 'notification_logs' })
@Index('ix_notification_logs_appointment', ['appointmentId'])
@Index('ix_notification_logs_kind', ['appointmentId', 'kind', 'channel'], { unique: true })
export class NotificationLog extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  appointmentId!: string;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment?: Appointment;

  @Column({ type: 'enum', enum: ['EMAIL', 'SMS', 'WHATSAPP'] })
  channel!: NotificationChannel;

  @Column({
    type: 'enum',
    enum: ['CREATED', 'CONFIRMED', 'CANCELLED', 'REMINDER_24H', 'REMINDER_1H'],
  })
  kind!: NotificationKind;

  @Column({ type: 'enum', enum: ['SENT', 'FAILED', 'SKIPPED'] })
  status!: NotificationStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  providerMessageId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;
}
