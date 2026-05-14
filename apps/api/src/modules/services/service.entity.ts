import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { decimalTransformer } from '../../shared/typeorm/decimal.transformer';
import { Company } from '../companies/company.entity';

@Entity({ name: 'services' })
@Index('ix_services_company_active', ['companyId', 'active'])
export class Service extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'int', unsigned: true })
  durationMinutes!: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  bufferMinutes!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  price!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
