import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { BusinessExceptionInput } from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { BusinessException } from './business-exception.entity';
import { BusinessExceptionsService } from './business-exceptions.service';

describe('BusinessExceptionsService', () => {
  const repo = {
    find: jest.fn(),
    create: jest.fn((v: Partial<BusinessException>) => v as BusinessException),
    save: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };
  const tenant = {
    requireCompanyId: jest.fn().mockReturnValue('company-1'),
  };

  let service: BusinessExceptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenant.requireCompanyId.mockReturnValue('company-1');
    service = new BusinessExceptionsService(
      repo as unknown as Repository<BusinessException>,
      tenant as unknown as TenantContextService,
    );
  });

  describe('list', () => {
    it('returns mapped exceptions for the tenant company', async () => {
      repo.find.mockResolvedValue([
        {
          id: 'ex-1',
          date: '2026-05-11',
          fullDay: true,
          startTime: null,
          endTime: null,
          reason: 'Feriado',
        },
      ]);

      await expect(service.list({})).resolves.toEqual([
        {
          id: 'ex-1',
          date: '2026-05-11',
          fullDay: true,
          startTime: null,
          endTime: null,
          reason: 'Feriado',
        },
      ]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        order: { date: 'ASC' },
      });
    });

    it('filters by from/to range when provided', async () => {
      repo.find.mockResolvedValue([]);
      await service.list({ from: '2026-05-01', to: '2026-05-31' });
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-1' }),
        }),
      );
    });

    it('normalizes Date date values to ISO date string', async () => {
      repo.find.mockResolvedValue([
        {
          id: 'ex-2',
          date: new Date('2026-05-11T00:00:00.000Z'),
          fullDay: false,
          startTime: '10:00',
          endTime: '11:00',
          reason: null,
        },
      ]);

      const [dto] = await service.list({});
      expect(dto!.date).toBe('2026-05-11');
    });
  });

  describe('create', () => {
    it('creates a full-day exception clearing times', async () => {
      const input: BusinessExceptionInput = {
        date: '2026-05-11',
        fullDay: true,
        startTime: '09:00',
        endTime: '10:00',
        reason: 'Feriado',
      };
      repo.save.mockImplementation(async (v: BusinessException) => ({
        ...v,
        id: 'ex-new',
      }));

      const result = await service.create(input);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          fullDay: true,
          startTime: null,
          endTime: null,
          reason: 'Feriado',
        }),
      );
      expect(result.id).toBe('ex-new');
    });

    it('creates a partial exception keeping times', async () => {
      repo.save.mockImplementation(async (v: BusinessException) => ({
        ...v,
        id: 'ex-partial',
      }));

      const result = await service.create({
        date: '2026-05-12',
        fullDay: false,
        startTime: '12:00',
        endTime: '13:00',
      });

      expect(result).toMatchObject({
        id: 'ex-partial',
        fullDay: false,
        startTime: '12:00',
        endTime: '13:00',
        reason: null,
      });
    });
  });

  describe('remove', () => {
    it('soft-removes an owned exception', async () => {
      const entity = { id: 'ex-1', companyId: 'company-1' } as BusinessException;
      repo.findOne.mockResolvedValue(entity);
      repo.softRemove.mockResolvedValue(entity);

      await expect(service.remove('ex-1')).resolves.toBeUndefined();
      expect(repo.softRemove).toHaveBeenCalledWith(entity);
    });

    it('throws NotFoundException when exception is missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
