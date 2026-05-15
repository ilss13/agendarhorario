import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../shared/infra/typeorm/base.entity';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'CANCEL'
  | 'RESCHEDULE'
  | 'CONFIRM'
  | 'BILLING_CHANGE_PLAN'
  | 'BILLING_CANCEL'
  | 'LGPD_EXPORT'
  | 'LGPD_DELETE';

@Entity({ name: 'audit_logs' })
@Index('ix_audit_logs_actor', ['actorUserId'])
@Index('ix_audit_logs_company', ['companyId', 'createdAt'])
@Index('ix_audit_logs_entity', ['entityType', 'entityId'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'char', length: 36, nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  actorEmail!: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  companyId!: string | null;

  @Column({ type: 'varchar', length: 40 })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 60 })
  entityType!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  entityId!: string | null;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;
}
