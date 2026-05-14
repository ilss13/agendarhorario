import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';

export interface NotificationToggles {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
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
    default: () => `('{"email":true,"sms":false,"whatsapp":false}')`,
  })
  notificationToggles!: NotificationToggles;
}
