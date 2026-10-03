import {
  appointmentSchema,
  appointmentStatusSchema,
  createAppointmentRequestSchema,
} from './appointment';

const id = '11111111-1111-4111-8111-111111111111';

const request = {
  serviceId: id,
  startsAt: '2026-10-02T13:00:00.000-03:00',
  customer: {
    name: 'Ana',
    email: 'ana@studio.com',
    phone: '+5511999999999',
  },
};

describe('appointment contracts', () => {
  it('accepts a booking request and keeps an optional verification token', () => {
    const result = createAppointmentRequestSchema.safeParse({
      ...request,
      customer: { ...request.customer, notes: '  janela  ' },
      verificationToken: 'token',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customer.notes).toBe('janela');
  });

  it('rejects a nameless customer and an invalid status', () => {
    expect(
      createAppointmentRequestSchema.safeParse({
        ...request,
        customer: { ...request.customer, name: 'A' },
      }).success,
    ).toBe(false);
    expect(appointmentStatusSchema.safeParse('WAITING').success).toBe(false);
    expect(appointmentStatusSchema.safeParse('CONFIRMED').success).toBe(true);
  });

  it('accepts an appointment dto', () => {
    expect(
      appointmentSchema.safeParse({
        id,
        serviceId: id,
        serviceName: 'Corte',
        customerName: 'Ana',
        startsAt: '2026-10-02T16:00:00.000Z',
        endsAt: '2026-10-02T16:30:00.000Z',
        status: 'PENDING',
      }).success,
    ).toBe(true);
  });
});
