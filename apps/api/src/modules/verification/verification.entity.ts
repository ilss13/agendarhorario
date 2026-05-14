import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';

export type VerificationType = 'EMAIL' | 'SMS';

@Entity({ name: 'verifications' })
@Index('ix_verifications_target', ['type', 'target'])
export class Verification extends BaseEntity {
  @Column({ type: 'enum', enum: ['EMAIL', 'SMS'] })
  type!: VerificationType;

  @Column({ type: 'varchar', length: 180 })
  target!: string;

  @Column({ type: 'varchar', length: 128 })
  codeHash!: string;

  @Column({ type: 'datetime', precision: 6 })
  expiresAt!: Date;

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts!: number;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  consumedAt!: Date | null;
}
