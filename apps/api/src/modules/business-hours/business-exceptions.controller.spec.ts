import { BusinessExceptionsController } from './business-exceptions.controller';
import { BusinessExceptionsService } from './business-exceptions.service';
import type { BusinessExceptionDto, BusinessExceptionInput } from '@agendarhorario/contracts';

describe('BusinessExceptionsController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  let controller: BusinessExceptionsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BusinessExceptionsController(service as unknown as BusinessExceptionsService);
  });

  it('lists exceptions via service', async () => {
    const items: BusinessExceptionDto[] = [
      {
        id: 'ex-1',
        date: '2026-05-11',
        fullDay: true,
        startTime: null,
        endTime: null,
        reason: null,
      },
    ];
    service.list.mockResolvedValue(items);

    await expect(controller.list({ from: '2026-05-01', to: '2026-05-31' })).resolves.toEqual(items);
    expect(service.list).toHaveBeenCalledWith({ from: '2026-05-01', to: '2026-05-31' });
  });

  it('creates an exception via service', async () => {
    const input: BusinessExceptionInput = {
      date: '2026-05-11',
      fullDay: true,
    };
    const created: BusinessExceptionDto = {
      id: 'ex-1',
      date: '2026-05-11',
      fullDay: true,
      startTime: null,
      endTime: null,
      reason: null,
    };
    service.create.mockResolvedValue(created);

    await expect(controller.create(input)).resolves.toEqual(created);
  });

  it('removes an exception via service', async () => {
    service.remove.mockResolvedValue(undefined);
    await expect(controller.remove('ex-1')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('ex-1');
  });

  it('propagates list failures', async () => {
    service.list.mockRejectedValue(new Error('tenant'));
    await expect(controller.list({})).rejects.toThrow('tenant');
  });
});
