import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';

@Entity({ name: 'billing_events' })
@Index('ix_billing_events_event', ['eventId'], { unique: true })
export class BillingEvent extends BaseEntity {
  @Column({ type: 'varchar', length: 20, default: 'stripe' })
  provider!: string;

  @Column({ type: 'varchar', length: 120 })
  eventId!: string;

  @Column({ type: 'varchar', length: 80 })
  type!: string;

  @Column({ type: 'json' })
  payload!: Record<string, unknown>;

  @Column({ type: 'datetime', precision: 6 })
  receivedAt!: Date;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  processedAt!: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;
}
