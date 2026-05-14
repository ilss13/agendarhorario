import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { Company } from '../companies/company.entity';

export type UserRole = 'OWNER' | 'STAFF' | 'CUSTOMER';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Index('uq_users_firebase_uid', { unique: true })
  @Column({ type: 'varchar', length: 128 })
  firebaseUid!: string;

  @Index('uq_users_email', { unique: true })
  @Column({ type: 'varchar', length: 180 })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'enum', enum: ['OWNER', 'STAFF', 'CUSTOMER'], default: 'CUSTOMER' })
  role!: UserRole;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified!: boolean;

  @Index('ix_users_company_id')
  @Column({ type: 'char', length: 36, nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company | null;
}
