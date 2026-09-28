import { companyAppointmentSchema, companyAppointmentsQuerySchema } from './company-appointments';

describe('company appointment contracts', () => {
  it('accepts a day query and a confirmed appointment', () => {
    expect(companyAppointmentsQuerySchema.safeParse({ date: '2026-09-23' }).success).toBe(true);
    expect(
      companyAppointmentSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        customerName: 'Camila',
        customerPhone: null,
        serviceName: 'Corte',
        startsAt: '2026-09-23T13:00:00.000Z',
        endsAt: '2026-09-23T13:45:00.000Z',
        status: 'CONFIRMED',
      }).success,
    ).toBe(true);
  });

  it('rejects a date that is not AAAA-MM-DD and an unknown status', () => {
    expect(companyAppointmentsQuerySchema.safeParse({ date: '23/09/2026' }).success).toBe(false);
    expect(
      companyAppointmentSchema.safeParse({
        id: '11111111-1111-4111-8111-111111111111',
        customerName: 'Camila',
        customerPhone: null,
        serviceName: 'Corte',
        startsAt: '2026-09-23T13:00:00.000Z',
        endsAt: '2026-09-23T13:45:00.000Z',
        status: 'DONE',
      }).success,
    ).toBe(false);
  });
});
