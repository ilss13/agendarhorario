import type { Job } from 'bullmq';
import type { NotificationJobData } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import type { NotificationsService } from './notifications.service';

jest.mock('@sentry/nestjs', () => ({
  withIsolationScope: jest.fn(async (fn: () => Promise<void>) => fn()),
}));

import * as Sentry from '@sentry/nestjs';

describe('NotificationsProcessor', () => {
  let service: jest.Mocked<Pick<NotificationsService, 'process'>>;
  let processor: NotificationsProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    service = { process: jest.fn().mockResolvedValue(undefined) };
    processor = new NotificationsProcessor(service as unknown as NotificationsService);
  });

  it('processes valid job payload via service inside Sentry scope', async () => {
    const data: NotificationJobData = { appointmentId: 'appt-1', kind: 'CREATED' };
    const job = { name: 'notify.CREATED', data } as Job<NotificationJobData>;

    await processor.process(job);

    expect(Sentry.withIsolationScope).toHaveBeenCalled();
    expect(service.process).toHaveBeenCalledWith(data);
  });

  it('propagates service errors for invalid/failing jobs', async () => {
    service.process.mockRejectedValue(new Error('invalid payload'));
    const job = {
      name: 'notify.CREATED',
      data: { appointmentId: '', kind: 'CREATED' },
    } as Job<NotificationJobData>;

    await expect(processor.process(job)).rejects.toThrow('invalid payload');
  });
});
