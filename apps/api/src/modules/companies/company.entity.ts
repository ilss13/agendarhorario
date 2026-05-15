import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';

export type SecondaryChannel = 'SMS' | 'WHATSAPP' | 'NONE';

export interface NotificationPrefs {
  email: boolean;
  secondaryChannel: SecondaryChannel;
}

@Entity({ name: 'companies' })
export class Company extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Index('uq_companies_slug', { unique: true })
  @Column({ type: 'varchar', length: 60 })
  slug!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 64, default: 'America/Sao_Paulo' })
  timezone!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({
    type: 'json',
    name: 'notificationPrefs',
    default: () => `('{"email":true,"secondaryChannel":"NONE"}')`,
  })
  notificationPrefs!: NotificationPrefs;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripeCustomerId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripeSubscriptionId!: string | null;
}
