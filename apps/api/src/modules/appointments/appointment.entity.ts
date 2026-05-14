import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Service } from '../services/service.entity';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

@Entity({ name: 'appointments' })
@Index('ix_appointments_company_starts', ['companyId', 'startsAt'])
@Index('ix_appointments_customer', ['customerId'])
export class Appointment extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @Column({ type: 'char', length: 36 })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'serviceId' })
  service?: Service;

  @Column({ type: 'char', length: 36 })
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'datetime', precision: 6 })
  startsAt!: Date;

  @Column({ type: 'datetime', precision: 6 })
  endsAt!: Date;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
    default: 'PENDING',
  })
  status!: AppointmentStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  cancelReason!: string | null;

  @Column({ type: 'json', nullable: true })
  notificationsSent!: Record<string, string> | null;
}
