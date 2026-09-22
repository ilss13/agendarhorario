import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { UpdateCompanyRequest } from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { CompaniesService } from './companies.service';
import { Company } from './company.entity';

describe('CompaniesService', () => {
  const findOne = jest.fn();
  const save = jest.fn();
  const requireCompanyId = jest.fn();
  const repo = { findOne, save } as unknown as Repository<Company>;
  const tenant = { requireCompanyId } as unknown as TenantContextService;
  let service: CompaniesService;

  const company = (): Company => {
    const entity = new Company();
    entity.id = 'c1';
    entity.name = 'Salão';
    entity.slug = 'salao';
    entity.phone = '+5511999999999';
    entity.email = 'a@b.com';
    entity.timezone = 'America/Sao_Paulo';
    entity.logoUrl = null;
    entity.notificationPrefs = { email: true, secondaryChannel: 'NONE' };
    return entity;
  };

  beforeEach(() => {
    findOne.mockReset();
    save.mockReset();
    requireCompanyId.mockReset();
    requireCompanyId.mockReturnValue('c1');
    service = new CompaniesService(repo, tenant);
  });

  describe('getMine', () => {
    it('returns the tenant company as DTO', async () => {
      findOne.mockResolvedValue(company());
      const dto = await service.getMine();
      expect(dto).toEqual(
        expect.objectContaining({
          id: 'c1',
          name: 'Salão',
          slug: 'salao',
          timezone: 'America/Sao_Paulo',
        }),
      );
    });

    it('throws NotFoundException when company is missing', async () => {
      findOne.mockResolvedValue(null);
      await expect(service.getMine()).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMine', () => {
    it('updates mutable fields and returns DTO', async () => {
      const entity = company();
      findOne.mockResolvedValueOnce(entity);
      save.mockImplementation(async (row: Company) => row);

      const input = {
        name: 'Novo',
        phone: null,
        timezone: 'America/Manaus',
        notificationPrefs: { email: false, secondaryChannel: 'WHATSAPP' },
      } as UpdateCompanyRequest;

      const dto = await service.updateMine(input);
      expect(dto.name).toBe('Novo');
      expect(dto.phone).toBeNull();
      expect(dto.timezone).toBe('America/Manaus');
      expect(dto.notificationPrefs).toEqual({ email: false, secondaryChannel: 'WHATSAPP' });
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when company is missing', async () => {
      findOne.mockResolvedValue(null);
      await expect(service.updateMine({ name: 'X' } as UpdateCompanyRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when new slug is taken', async () => {
      findOne.mockResolvedValueOnce(company()).mockResolvedValueOnce({ id: 'other' });
      await expect(service.updateMine({ slug: 'taken' } as UpdateCompanyRequest)).rejects.toThrow(
        ConflictException,
      );
      expect(save).not.toHaveBeenCalled();
    });

    it('changes slug when it is available', async () => {
      const entity = company();
      findOne.mockResolvedValueOnce(entity).mockResolvedValueOnce(null);
      save.mockImplementation(async (row: Company) => row);

      const dto = await service.updateMine({ slug: 'novo-slug' } as UpdateCompanyRequest);
      expect(dto.slug).toBe('novo-slug');
    });

    it('skips slug uniqueness check when slug is unchanged', async () => {
      const entity = company();
      findOne.mockResolvedValueOnce(entity);
      save.mockImplementation(async (row: Company) => row);

      await service.updateMine({ slug: 'salao', name: 'Mesmo' } as UpdateCompanyRequest);
      expect(findOne).toHaveBeenCalledTimes(1);
      expect(entity.name).toBe('Mesmo');
    });
  });
});
