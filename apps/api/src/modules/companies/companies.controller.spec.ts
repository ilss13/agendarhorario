import { ConflictException, NotFoundException } from '@nestjs/common';
import type { CompanyDto, UpdateCompanyRequest } from '@agendarhorario/contracts';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

describe('CompaniesController', () => {
  const getMine = jest.fn();
  const updateMine = jest.fn();
  const companies = { getMine, updateMine } as unknown as CompaniesService;
  const controller = new CompaniesController(companies);

  beforeEach(() => {
    getMine.mockReset();
    updateMine.mockReset();
  });

  it('returns the company for the current tenant', async () => {
    const dto = { id: 'c1', name: 'Salão', slug: 'salao' } as CompanyDto;
    getMine.mockResolvedValue(dto);

    await expect(controller.getMine()).resolves.toEqual(dto);
    expect(getMine).toHaveBeenCalledTimes(1);
  });

  it('propagates NotFoundException from getMine', async () => {
    getMine.mockRejectedValue(new NotFoundException('Empresa não encontrada'));
    await expect(controller.getMine()).rejects.toThrow(NotFoundException);
  });

  it('updates the company via the service', async () => {
    const input = { name: 'Novo' } as UpdateCompanyRequest;
    const dto = { id: 'c1', name: 'Novo', slug: 'salao' } as CompanyDto;
    updateMine.mockResolvedValue(dto);

    await expect(controller.update(input)).resolves.toEqual(dto);
    expect(updateMine).toHaveBeenCalledWith(input);
  });

  it('propagates ConflictException from updateMine', async () => {
    updateMine.mockRejectedValue(new ConflictException('Slug já está em uso'));
    await expect(controller.update({ slug: 'taken' } as UpdateCompanyRequest)).rejects.toThrow(
      ConflictException,
    );
  });
});
