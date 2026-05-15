import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLog } from './audit-log.entity';

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  companyId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          actorUserId: entry.actorUserId ?? null,
          actorEmail: entry.actorEmail ?? null,
          companyId: entry.companyId ?? null,
          metadata: entry.metadata ?? null,
        }),
      );
    } catch (err) {
      // Audit nunca deve quebrar o fluxo principal
      this.logger.error(`audit log falhou: ${(err as Error).message}`);
    }
  }
}
