import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { BusinessHour } from './business-hour.entity';
import { BusinessHoursService, validateNoOverlap } from './business-hours.service';

describe('validateNoOverlap', () => {
  it('accepts disjoint ranges on same day', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '18:00' },
      ]),
    ).not.toThrow();
  });

  it('accepts adjacent ranges (touching boundaries)', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 2, startTime: '12:00', endTime: '18:00' },
      ]),
    ).not.toThrow();
  });

  it('rejects overlapping ranges on same day', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 3, startTime: '08:00', endTime: '12:30' },
        { dayOfWeek: 3, startTime: '12:00', endTime: '18:00' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('ignores overlap across different days', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
      ]),
    ).not.toThrow();
  });

  it('detects overlap regardless of input order', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 4, startTime: '15:00', endTime: '18:00' },
        { dayOfWeek: 4, startTime: '12:00', endTime: '16:00' },
      ]),
    ).toThrow(BadRequestException);
  });
});

describe('BusinessHoursService', () => {
  const repo = {
    find: jest.fn(),
  };
  const tenant = {
    requireCompanyId: jest.fn().mockReturnValue('company-1'),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  let service: BusinessHoursService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenant.requireCompanyId.mockReturnValue('company-1');
    service = new BusinessHoursService(
      repo as unknown as Repository<BusinessHour>,
      tenant as unknown as TenantContextService,
      dataSource as unknown as DataSource,
    );
  });

  describe('list', () => {
    it('returns mapped hours ordered by day and start', async () => {
      repo.find.mockResolvedValue([
        { id: 'bh-1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      ]);

      await expect(service.list()).resolves.toEqual([
        { id: 'bh-1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      ]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        order: { dayOfWeek: 'ASC', startTime: 'ASC' },
      });
    });

    it('propagates tenant errors', async () => {
      tenant.requireCompanyId.mockImplementation(() => {
        throw new Error('Usuário não vinculado a uma empresa');
      });
      await expect(service.list()).rejects.toThrow('Usuário não vinculado a uma empresa');
    });
  });

  describe('replace', () => {
    it('replaces hours inside a transaction and sorts the result', async () => {
      const qb = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const txRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        create: jest.fn((rows: Partial<BusinessHour>[]) => rows as BusinessHour[]),
        save: jest.fn(async (rows: BusinessHour[]) =>
          rows.map((r, i) => ({ ...r, id: `bh-${i}` })),
        ),
      };
      dataSource.transaction.mockImplementation(
        async (cb: (m: EntityManager) => Promise<unknown>) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(txRepo),
          } as unknown as EntityManager;
          return cb(manager);
        },
      );

      const result = await service.replace({
        hours: [
          { dayOfWeek: 2, startTime: '13:00', endTime: '18:00' },
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        ],
      });

      expect(result.map((h) => h.dayOfWeek)).toEqual([1, 2]);
      expect(qb.execute).toHaveBeenCalled();
    });

    it('throws BadRequestException when input hours overlap', async () => {
      await expect(
        service.replace({
          hours: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
