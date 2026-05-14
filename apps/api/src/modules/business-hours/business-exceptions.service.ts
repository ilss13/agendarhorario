import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import type { BusinessExceptionDto, BusinessExceptionInput } from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { BusinessException } from './business-exception.entity';

@Injectable()
export class BusinessExceptionsService {
  constructor(
    @InjectRepository(BusinessException)
    private readonly repo: Repository<BusinessException>,
    private readonly tenant: TenantContextService,
  ) {}

  async list(opts: { from?: string; to?: string }): Promise<BusinessExceptionDto[]> {
    const companyId = this.tenant.requireCompanyId();
    const where = {
      companyId,
      ...(opts.from && opts.to ? { date: Between(opts.from, opts.to) } : {}),
    };
    const items = await this.repo.find({ where, order: { date: 'ASC' } });
    return items.map(toDto);
  }

  async create(input: BusinessExceptionInput): Promise<BusinessExceptionDto> {
    const companyId = this.tenant.requireCompanyId();
    const entity = this.repo.create({
      companyId,
      date: input.date,
      fullDay: input.fullDay,
      startTime: input.fullDay ? null : (input.startTime ?? null),
      endTime: input.fullDay ? null : (input.endTime ?? null),
      reason: input.reason ?? null,
    });
    const saved = await this.repo.save(entity);
    return toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const companyId = this.tenant.requireCompanyId();
    const entity = await this.repo.findOne({ where: { id, companyId } });
    if (!entity) throw new NotFoundException('Exceção não encontrada');
    await this.repo.softRemove(entity);
  }
}

const toDto = (entity: BusinessException): BusinessExceptionDto => ({
  id: entity.id,
  date:
    typeof entity.date === 'string'
      ? entity.date
      : new Date(entity.date).toISOString().slice(0, 10),
  fullDay: entity.fullDay,
  startTime: entity.startTime,
  endTime: entity.endTime,
  reason: entity.reason,
});
