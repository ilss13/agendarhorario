import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { CreateServiceRequest, UpdateServiceRequest } from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { Service } from './service.entity';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  const repo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((v: Partial<Service>) => v as Service),
    save: jest.fn(),
    softRemove: jest.fn(),
  };
  const tenant = {
    requireCompanyId: jest.fn().mockReturnValue('company-1'),
  };

  let service: ServicesService;

  const entity = {
    id: 'svc-1',
    companyId: 'company-1',
    name: 'Corte',
    description: 'desc',
    durationMinutes: 30,
    bufferMinutes: 0,
    price: 40,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  } as Service;

  beforeEach(() => {
    jest.clearAllMocks();
    tenant.requireCompanyId.mockReturnValue('company-1');
    service = new ServicesService(
      repo as unknown as Repository<Service>,
      tenant as unknown as TenantContextService,
    );
  });

  describe('list', () => {
    it('returns paginated services for the company', async () => {
      repo.findAndCount.mockResolvedValue([[entity], 1]);

      await expect(service.list({ page: 1, pageSize: 10 })).resolves.toEqual({
        items: [
          {
            id: 'svc-1',
            name: 'Corte',
            description: 'desc',
            durationMinutes: 30,
            bufferMinutes: 0,
            price: 40,
            active: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });

    it('applies name search when q is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.list({ page: 2, pageSize: 5, q: 'corte' });
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({ companyId: 'company-1' }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('returns owned service dto', async () => {
      repo.findOne.mockResolvedValue(entity);
      await expect(service.getById('svc-1')).resolves.toMatchObject({ id: 'svc-1', name: 'Corte' });
    });

    it('throws NotFoundException when service is not owned', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a service with defaults', async () => {
      const input: CreateServiceRequest = {
        name: 'Barba',
        durationMinutes: 20,
        bufferMinutes: 0,
        price: 0,
        active: true,
      };
      repo.save.mockImplementation(async (v: Service) => ({
        ...entity,
        ...v,
        id: 'svc-new',
        description: null,
        bufferMinutes: 0,
        price: 0,
        active: true,
      }));

      const result = await service.create(input);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          name: 'Barba',
          bufferMinutes: 0,
          price: 0,
          active: true,
        }),
      );
      expect(result.id).toBe('svc-new');
    });

    it('creates a service with explicit optional fields', async () => {
      repo.save.mockImplementation(async (v: Service) => ({
        ...entity,
        ...v,
        id: 'svc-full',
      }));

      const result = await service.create({
        name: 'Combo',
        description: 'corte+barba',
        durationMinutes: 45,
        bufferMinutes: 10,
        price: 80,
        active: false,
      });

      expect(result).toMatchObject({
        id: 'svc-full',
        name: 'Combo',
        bufferMinutes: 10,
        price: 80,
        active: false,
      });
    });
  });

  describe('update', () => {
    it('patches provided fields only', async () => {
      repo.findOne.mockResolvedValue({ ...entity });
      repo.save.mockImplementation(async (v: Service) => v);
      const input: UpdateServiceRequest = { name: 'Corte especial', price: 55 };

      const result = await service.update('svc-1', input);
      expect(result.name).toBe('Corte especial');
      expect(result.price).toBe(55);
      expect(result.durationMinutes).toBe(30);
    });

    it('throws NotFoundException when updating missing service', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('clears description when set to null', async () => {
      repo.findOne.mockResolvedValue({ ...entity });
      repo.save.mockImplementation(async (v: Service) => v);

      const result = await service.update('svc-1', {
        description: null,
        durationMinutes: 40,
        bufferMinutes: 5,
        active: false,
      });
      expect(result.description).toBeNull();
      expect(result.durationMinutes).toBe(40);
      expect(result.bufferMinutes).toBe(5);
      expect(result.active).toBe(false);
    });
  });

  describe('remove', () => {
    it('soft-removes owned service', async () => {
      repo.findOne.mockResolvedValue(entity);
      repo.softRemove.mockResolvedValue(entity);
      await expect(service.remove('svc-1')).resolves.toBeUndefined();
      expect(repo.softRemove).toHaveBeenCalledWith(entity);
    });

    it('throws NotFoundException when removing missing service', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
