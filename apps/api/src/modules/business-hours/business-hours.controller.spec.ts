import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';
import type { BusinessHourDto, ReplaceBusinessHoursRequest } from '@agendarhorario/contracts';

describe('BusinessHoursController', () => {
  const service = {
    list: jest.fn(),
    replace: jest.fn(),
  };

  let controller: BusinessHoursController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BusinessHoursController(service as unknown as BusinessHoursService);
  });

  it('lists business hours via service', async () => {
    const items: BusinessHourDto[] = [
      { id: 'bh-1', dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
    ];
    service.list.mockResolvedValue(items);
    await expect(controller.list()).resolves.toEqual(items);
  });

  it('replaces business hours via service', async () => {
    const input: ReplaceBusinessHoursRequest = {
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
    };
    const saved: BusinessHourDto[] = [
      { id: 'bh-1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
    ];
    service.replace.mockResolvedValue(saved);

    await expect(controller.replace(input)).resolves.toEqual(saved);
    expect(service.replace).toHaveBeenCalledWith(input);
  });

  it('propagates replace failures', async () => {
    service.replace.mockRejectedValue(new Error('overlap'));
    await expect(
      controller.replace({ hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }] }),
    ).rejects.toThrow('overlap');
  });
});
