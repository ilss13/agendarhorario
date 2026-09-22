import {
  NOTIFICATIONS_QUEUE,
  jobNameFor,
  type NotificationJobData,
} from './notifications.constants';

describe('notifications.constants', () => {
  it('exposes queue name', () => {
    expect(NOTIFICATIONS_QUEUE).toBe('notifications');
  });

  it('builds job names for every kind', () => {
    expect(jobNameFor('CREATED')).toBe('notify.CREATED');
    expect(jobNameFor('CONFIRMED')).toBe('notify.CONFIRMED');
    expect(jobNameFor('CANCELLED')).toBe('notify.CANCELLED');
    expect(jobNameFor('REMINDER_24H')).toBe('notify.REMINDER_24H');
    expect(jobNameFor('REMINDER_1H')).toBe('notify.REMINDER_1H');
  });

  it('accepts NotificationJobData shape', () => {
    const data: NotificationJobData = { appointmentId: 'appt-1', kind: 'CREATED' };
    expect(data.appointmentId).toBe('appt-1');
    expect(data.kind).toBe('CREATED');
  });
});
