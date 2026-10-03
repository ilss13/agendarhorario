import {
  cancelRequestSchema,
  myAppointmentSchema,
  myAppointmentsQuerySchema,
  rescheduleRequestSchema,
} from './me';

const id = '11111111-1111-4111-8111-111111111111';

describe('me contracts', () => {
  it('defaults the appointment list to upcoming and accepts a reschedule', () => {
    const query = myAppointmentsQuerySchema.safeParse({});
    expect(query.success).toBe(true);
    if (query.success) {
      expect(query.data.range).toBe('upcoming');
      expect(query.data.page).toBe(1);
    }
    expect(
      rescheduleRequestSchema.safeParse({ startsAt: '2026-10-02T13:00:00.000-03:00' }).success,
    ).toBe(true);
    const cancelled = cancelRequestSchema.safeParse({ reason: '  imprevisto  ' });
    expect(cancelled.success).toBe(true);
    if (cancelled.success) expect(cancelled.data.reason).toBe('imprevisto');
  });

  it('rejects an unknown range and a datetime without offset', () => {
    expect(myAppointmentsQuerySchema.safeParse({ range: 'today' }).success).toBe(false);
    expect(rescheduleRequestSchema.safeParse({ startsAt: '2026-10-02T13:00:00' }).success).toBe(
      false,
    );
    expect(cancelRequestSchema.safeParse({ reason: 'x'.repeat(201) }).success).toBe(false);
  });

  it('accepts a customer appointment', () => {
    expect(
      myAppointmentSchema.safeParse({
        id,
        companyName: 'Salao',
        companySlug: 'salao',
        serviceId: id,
        serviceName: 'Corte',
        startsAt: '2026-10-02T16:00:00.000Z',
        endsAt: '2026-10-02T16:30:00.000Z',
        status: 'CONFIRMED',
      }).success,
    ).toBe(true);
  });
});
