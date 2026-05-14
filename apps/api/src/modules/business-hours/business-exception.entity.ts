import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { Company } from '../companies/company.entity';

@Entity({ name: 'business_exceptions' })
@Index('ix_business_exceptions_company_date', ['companyId', 'date'])
export class BusinessException extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  /** ISO date YYYY-MM-DD interpretado no timezone da empresa */
  @Column({ type: 'date' })
  date!: string;

  /** Bloqueio do dia inteiro (true) ou janela parcial (false) */
  @Column({ type: 'boolean', default: true })
  fullDay!: boolean;

  @Column({ type: 'varchar', length: 5, nullable: true })
  startTime!: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  endTime!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason!: string | null;
}
