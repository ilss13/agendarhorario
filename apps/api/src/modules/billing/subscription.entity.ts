import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { Company } from '../companies/company.entity';
import { Plan } from './plan.entity';

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

@Entity({ name: 'subscriptions' })
@Index('ix_subscriptions_company', ['companyId'])
@Index('ix_subscriptions_stripe', ['stripeSubscriptionId'], { unique: true })
export class Subscription extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @Column({ type: 'char', length: 36 })
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan?: Plan;

  @Column({ type: 'varchar', length: 120 })
  stripeSubscriptionId!: string;

  @Column({
    type: 'enum',
    enum: [
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
    ],
  })
  status!: SubscriptionStatus;

  @Column({ type: 'datetime', precision: 6 })
  currentPeriodStart!: Date;

  @Column({ type: 'datetime', precision: 6 })
  currentPeriodEnd!: Date;

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  canceledAt!: Date | null;
}
