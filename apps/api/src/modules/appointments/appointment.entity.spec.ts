import { Appointment } from './appointment.entity';

describe('Appointment', () => {
  it('holds appointment fields when constructed', () => {
    const startsAt = new Date('2026-05-11T13:00:00.000Z');
    const endsAt = new Date('2026-05-11T13:30:00.000Z');
    const entity = new Appointment();
    entity.id = 'appt-1';
    entity.companyId = 'company-1';
    entity.serviceId = 'service-1';
    entity.customerId = 'customer-1';
    entity.startsAt = startsAt;
    entity.endsAt = endsAt;
    entity.status = 'PENDING';
    entity.cancelReason = null;
    entity.notificationsSent = null;

    expect(entity.companyId).toBe('company-1');
    expect(entity.status).toBe('PENDING');
    expect(entity.startsAt).toBe(startsAt);
    expect(entity.endsAt).toBe(endsAt);
  });

  it('stores cancel reason and notifications map', () => {
    const entity = new Appointment();
    entity.status = 'CANCELLED';
    entity.cancelReason = 'Cancelado pelo cliente';
    entity.notificationsSent = { CREATED: 'job-1' };

    expect(entity.cancelReason).toBe('Cancelado pelo cliente');
    expect(entity.notificationsSent).toEqual({ CREATED: 'job-1' });
  });
});
