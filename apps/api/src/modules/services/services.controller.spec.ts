import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import type { ServiceDto } from '@agendarhorario/contracts';

describe('ServicesController', () => {
  const services = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  let controller: ServicesController;

  const dto: ServiceDto = {
    id: 'svc-1',
    name: 'Corte',
    description: null,
    durationMinutes: 30,
    bufferMinutes: 0,
    price: 40,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ServicesController(services as unknown as ServicesService);
  });

  it('lists services', async () => {
    services.list.mockResolvedValue({ items: [dto], total: 1, page: 1, pageSize: 10 });
    await expect(controller.list({ page: 1, pageSize: 10 })).resolves.toMatchObject({
      total: 1,
      items: [dto],
    });
  });

  it('gets service by id', async () => {
    services.getById.mockResolvedValue(dto);
    await expect(controller.getById('svc-1')).resolves.toEqual(dto);
  });

  it('creates a service', async () => {
    services.create.mockResolvedValue(dto);
    await expect(
      controller.create({
        name: 'Corte',
        durationMinutes: 30,
        bufferMinutes: 0,
        price: 0,
        active: true,
      }),
    ).resolves.toEqual(dto);
  });

  it('updates a service', async () => {
    services.update.mockResolvedValue({ ...dto, name: 'Novo' });
    await expect(controller.update('svc-1', { name: 'Novo' })).resolves.toMatchObject({
      name: 'Novo',
    });
  });

  it('removes a service', async () => {
    services.remove.mockResolvedValue(undefined);
    await expect(controller.remove('svc-1')).resolves.toBeUndefined();
  });

  it('propagates getById failures', async () => {
    services.getById.mockRejectedValue(new Error('missing'));
    await expect(controller.getById('x')).rejects.toThrow('missing');
  });
});
