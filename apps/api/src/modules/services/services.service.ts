import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import type {
  CreateServiceRequest,
  PaginatedResult,
  ServiceDto,
  UpdateServiceRequest,
} from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { Service } from './service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly repo: Repository<Service>,
    private readonly tenant: TenantContextService,
  ) {}

  async list(opts: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PaginatedResult<ServiceDto>> {
    const companyId = this.tenant.requireCompanyId();
    const where = {
      companyId,
      ...(opts.q ? { name: ILike(`%${opts.q}%`) } : {}),
    };
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    });
    return {
      items: items.map(toDto),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }

  async getById(id: string): Promise<ServiceDto> {
    const entity = await this.findOwned(id);
    return toDto(entity);
  }

  async create(input: CreateServiceRequest): Promise<ServiceDto> {
    const companyId = this.tenant.requireCompanyId();
    const entity = this.repo.create({
      companyId,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      bufferMinutes: input.bufferMinutes ?? 0,
      price: input.price ?? 0,
      active: input.active ?? true,
    });
    const saved = await this.repo.save(entity);
    return toDto(saved);
  }

  async update(id: string, input: UpdateServiceRequest): Promise<ServiceDto> {
    const entity = await this.findOwned(id);
    Object.assign(entity, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.bufferMinutes !== undefined ? { bufferMinutes: input.bufferMinutes } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
    const saved = await this.repo.save(entity);
    return toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOwned(id);
    await this.repo.softRemove(entity);
  }

  private async findOwned(id: string): Promise<Service> {
    const companyId = this.tenant.requireCompanyId();
    const entity = await this.repo.findOne({ where: { id, companyId } });
    if (!entity) throw new NotFoundException('Serviço não encontrado');
    return entity;
  }
}

const toDto = (entity: Service): ServiceDto => ({
  id: entity.id,
  name: entity.name,
  description: entity.description,
  durationMinutes: entity.durationMinutes,
  bufferMinutes: entity.bufferMinutes,
  price: Number(entity.price),
  active: entity.active,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});
