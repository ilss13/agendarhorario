import { AppointmentActionController } from './appointment-action.controller';
import { AppointmentActionService } from './appointment-action.service';
import { Appointment } from './appointment.entity';

describe('AppointmentActionController', () => {
  const actions = {
    preview: jest.fn(),
    consume: jest.fn(),
  } as unknown as jest.Mocked<Pick<AppointmentActionService, 'preview' | 'consume'>> & {
    preview: jest.Mock;
    consume: jest.Mock;
  };

  let controller: AppointmentActionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AppointmentActionController(actions as unknown as AppointmentActionService);
  });

  describe('preview', () => {
    it('maps appointment relations into ActionPreviewDto', async () => {
      const startsAt = new Date('2026-05-11T13:00:00.000Z');
      const endsAt = new Date('2026-05-11T13:30:00.000Z');
      const expiresAt = new Date('2026-05-12T13:00:00.000Z');
      const appointment = {
        id: 'appt-1',
        status: 'PENDING',
        startsAt,
        endsAt,
        service: { name: 'Corte', durationMinutes: 30, price: 40 },
        company: { name: 'Barbearia', phone: '+5511999999999', logoUrl: null },
        customer: { name: 'Ana' },
      } as Appointment;

      actions.preview.mockResolvedValue({
        appointment,
        kind: 'CONFIRM',
        consumed: false,
        expiresAt,
      });

      await expect(controller.preview('tok')).resolves.toEqual({
        kind: 'CONFIRM',
        alreadyConsumed: false,
        expiresAt: expiresAt.toISOString(),
        appointment: {
          id: 'appt-1',
          serviceName: 'Corte',
          companyName: 'Barbearia',
          companyPhone: '+5511999999999',
          logoUrl: null,
          customerName: 'Ana',
          durationMinutes: 30,
          price: 40,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          status: 'PENDING',
        },
      });
    });

    it('falls back to empty names when relations are missing', async () => {
      const startsAt = new Date('2026-05-11T13:00:00.000Z');
      const endsAt = new Date('2026-05-11T13:30:00.000Z');
      const appointment = {
        id: 'appt-2',
        status: 'CONFIRMED',
        startsAt,
        endsAt,
      } as Appointment;

      actions.preview.mockResolvedValue({
        appointment,
        kind: 'CANCEL',
        consumed: true,
        expiresAt: new Date('2026-05-12T13:00:00.000Z'),
      });

      const result = await controller.preview('tok');
      expect(result.alreadyConsumed).toBe(true);
      expect(result.appointment.serviceName).toBe('');
      expect(result.appointment.companyName).toBe('');
      expect(result.appointment.customerName).toBe('');
      expect(result.appointment.durationMinutes).toBe(0);
      expect(result.appointment.price).toBe(0);
      expect(result.appointment.companyPhone).toBeNull();
      expect(result.appointment.logoUrl).toBeNull();
    });
  });

  describe('confirm', () => {
    it('returns status from consumed appointment', async () => {
      actions.consume.mockResolvedValue({ status: 'CONFIRMED' } as Appointment);

      await expect(controller.confirm('tok', { kind: 'CONFIRM' })).resolves.toEqual({
        status: 'CONFIRMED',
      });
      expect(actions.consume).toHaveBeenCalledWith('tok', 'CONFIRM');
    });

    it('propagates consume failures', async () => {
      actions.consume.mockRejectedValue(new Error('boom'));
      await expect(controller.confirm('tok', { kind: 'CANCEL' })).rejects.toThrow('boom');
    });
  });
});
