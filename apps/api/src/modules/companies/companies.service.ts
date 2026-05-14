import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { CompanyDto, UpdateCompanyRequest } from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private readonly repo: Repository<Company>,
    private readonly tenant: TenantContextService,
  ) {}

  async getMine(): Promise<CompanyDto> {
    const companyId = this.tenant.requireCompanyId();
    const entity = await this.repo.findOne({ where: { id: companyId } });
    if (!entity) throw new NotFoundException('Empresa não encontrada');
    return toDto(entity);
  }

  async updateMine(input: UpdateCompanyRequest): Promise<CompanyDto> {
    const companyId = this.tenant.requireCompanyId();
    const entity = await this.repo.findOne({ where: { id: companyId } });
    if (!entity) throw new NotFoundException('Empresa não encontrada');

    if (input.slug && input.slug !== entity.slug) {
      const slugTaken = await this.repo.findOne({
        where: { slug: input.slug, id: Not(companyId) },
      });
      if (slugTaken) throw new ConflictException('Slug já está em uso');
      entity.slug = input.slug;
    }
    if (input.name !== undefined) entity.name = input.name;
    if (input.phone !== undefined) entity.phone = input.phone ?? null;
    if (input.timezone !== undefined) entity.timezone = input.timezone;
    if (input.notificationToggles !== undefined) {
      entity.notificationToggles = input.notificationToggles;
    }

    const saved = await this.repo.save(entity);
    return toDto(saved);
  }
}

const toDto = (entity: Company): CompanyDto => ({
  id: entity.id,
  name: entity.name,
  slug: entity.slug,
  phone: entity.phone,
  email: entity.email,
  timezone: entity.timezone,
  logoUrl: entity.logoUrl,
  notificationToggles: entity.notificationToggles,
});
