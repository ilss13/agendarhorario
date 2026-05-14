import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { Company } from '../companies/company.entity';

@Entity({ name: 'business_hours' })
@Index('ix_business_hours_company_day', ['companyId', 'dayOfWeek'])
export class BusinessHour extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  /** 0 = Sunday ... 6 = Saturday */
  @Column({ type: 'tinyint', unsigned: true })
  dayOfWeek!: number;

  @Column({ type: 'varchar', length: 5 })
  startTime!: string;

  @Column({ type: 'varchar', length: 5 })
  endTime!: string;
}
