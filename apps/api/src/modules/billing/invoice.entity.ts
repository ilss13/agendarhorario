import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';
import { decimalTransformer } from '../../shared/typeorm/decimal.transformer';
import { Company } from '../companies/company.entity';
import { Subscription } from './subscription.entity';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

@Entity({ name: 'invoices' })
@Index('ix_invoices_company', ['companyId'])
@Index('ix_invoices_stripe', ['stripeInvoiceId'], { unique: true })
export class Invoice extends BaseEntity {
  @Column({ type: 'char', length: 36 })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @Column({ type: 'char', length: 36, nullable: true })
  subscriptionId!: string | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: Subscription | null;

  @Column({ type: 'varchar', length: 120 })
  stripeInvoiceId!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  number!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  amountTotal!: number;

  @Column({ type: 'varchar', length: 8, default: 'brl' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'open', 'paid', 'uncollectible', 'void'],
    default: 'open',
  })
  status!: InvoiceStatus;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  dueDate!: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  hostedInvoiceUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl!: string | null;
}
