import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { decimalTransformer } from '../../shared/typeorm/decimal.transformer';

export type PlanCode = 'basico' | 'medio' | 'grande' | 'super';

@Entity({ name: 'plans' })
export class Plan extends BaseEntity {
  @Index('uq_plans_code', { unique: true })
  @Column({ type: 'varchar', length: 20 })
  code!: PlanCode;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  priceBrl!: number;

  @Column({ type: 'int', unsigned: true })
  monthlyAppointmentLimit!: number;

  @Column({ type: 'varchar', length: 120 })
  stripePriceId!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sortOrder!: number;
}
