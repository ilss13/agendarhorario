import type { MyAppointmentDto } from '@agendarhorario/contracts';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MyAppointmentsController } from './my-appointments.controller';
import type { MyAppointmentsService } from './my-appointments.service';

describe('MyAppointmentsController', () => {
  const user: AuthenticatedUser = {
    id: 'user-1',
    firebaseUid: 'fb-1',
    email: 'user@example.com',
    name: 'User',
    phone: null,
    role: 'CUSTOMER',
    companyId: null,
    emailVerified: true,
    phoneVerified: false,
  };

  const dto: MyAppointmentDto = {
    id: 'appt-1',
    companyName: 'Salon',
    companySlug: 'salon',
    serviceId: 'svc-1',
    serviceName: 'Cut',
    startsAt: '2026-06-01T12:00:00.000Z',
    endsAt: '2026-06-01T12:30:00.000Z',
    status: 'PENDING',
  };

  let service: jest.Mocked<
    Pick<MyAppointmentsService, 'list' | 'getById' | 'cancel' | 'reschedule'>
  >;
  let controller: MyAppointmentsController;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      getById: jest.fn(),
      cancel: jest.fn(),
      reschedule: jest.fn(),
    };
    controller = new MyAppointmentsController(service as unknown as MyAppointmentsService);
  });

  it('list delegates to service', async () => {
    const result = { items: [dto], total: 1, page: 1, pageSize: 20 };
    service.list.mockResolvedValue(result);

    await expect(
      controller.list(user, { page: 1, pageSize: 20, range: 'upcoming' }),
    ).resolves.toEqual(result);
    expect(service.list).toHaveBeenCalledWith(user, { page: 1, pageSize: 20, range: 'upcoming' });
  });

  it('getById delegates to service', async () => {
    service.getById.mockResolvedValue(dto);
    await expect(controller.getById(user, 'appt-1')).resolves.toEqual(dto);
    expect(service.getById).toHaveBeenCalledWith(user, 'appt-1');
  });

  it('cancel passes reason or null', async () => {
    service.cancel.mockResolvedValue({ ...dto, status: 'CANCELLED' });
    await expect(controller.cancel(user, 'appt-1', { reason: 'busy' })).resolves.toMatchObject({
      status: 'CANCELLED',
    });
    expect(service.cancel).toHaveBeenCalledWith(user, 'appt-1', 'busy');

    await controller.cancel(user, 'appt-1', {});
    expect(service.cancel).toHaveBeenCalledWith(user, 'appt-1', null);
  });

  it('reschedule delegates startsAt', async () => {
    service.reschedule.mockResolvedValue(dto);
    await expect(
      controller.reschedule(user, 'appt-1', { startsAt: '2026-06-02T15:00:00.000-03:00' }),
    ).resolves.toEqual(dto);
    expect(service.reschedule).toHaveBeenCalledWith(
      user,
      'appt-1',
      '2026-06-02T15:00:00.000-03:00',
    );
  });

  it('propagates service errors', async () => {
    service.getById.mockRejectedValue(new Error('not found'));
    await expect(controller.getById(user, 'missing')).rejects.toThrow('not found');
  });
});
