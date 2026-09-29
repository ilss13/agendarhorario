import { Repository } from 'typeorm';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { Appointment } from './appointment.entity';
import { CompanyAppointmentsService } from './company-appointments.service';

describe('CompanyAppointmentsService', () => {
  const appointments = { find: jest.fn() };
  const tenant = { requireCompanyId: jest.fn().mockReturnValue('company-1') };
  let service: CompanyAppointmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenant.requireCompanyId.mockReturnValue('company-1');
    service = new CompanyAppointmentsService(
      appointments as unknown as Repository<Appointment>,
      tenant as unknown as TenantContextService,
    );
  });

  it('lists the company day and keeps client confirmation status', async () => {
    appointments.find.mockResolvedValue([
      {
        id: 'appt-1',
        status: 'CONFIRMED',
        startsAt: new Date('2026-09-23T13:00:00.000Z'),
        endsAt: new Date('2026-09-23T13:45:00.000Z'),
        customer: { name: 'Camila', phone: '+5511999999999' },
        service: { name: 'Corte' },
      },
    ]);

    await expect(service.listByDate('2026-09-23')).resolves.toEqual({
      date: '2026-09-23',
      items: [
        {
          id: 'appt-1',
          customerName: 'Camila',
          customerPhone: '+5511999999999',
          serviceName: 'Corte',
          startsAt: '2026-09-23T13:00:00.000Z',
          endsAt: '2026-09-23T13:45:00.000Z',
          status: 'CONFIRMED',
        },
      ],
    });
    expect(appointments.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-1' }),
        order: { startsAt: 'ASC' },
      }),
    );
  });

  it('returns an empty day when the company has no appointments', async () => {
    appointments.find.mockResolvedValue([]);
    await expect(service.listByDate('2026-09-23')).resolves.toEqual({
      date: '2026-09-23',
      items: [],
    });
  });

  it('rejects an impossible calendar date', async () => {
    await expect(service.listByDate('2026-02-31')).rejects.toThrow('Data inválida');
    expect(appointments.find).not.toHaveBeenCalled();
  });

  it('lists the company month in start order', async () => {
    appointments.find.mockResolvedValue([]);
    await expect(service.listByMonth('2026-09')).resolves.toEqual({ month: '2026-09', items: [] });
    expect(appointments.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-1' }),
        order: { startsAt: 'ASC' },
      }),
    );
  });

  it('rejects an impossible month before querying', async () => {
    await expect(service.listByMonth('2026-13')).rejects.toThrow('Mês inválido');
    expect(appointments.find).not.toHaveBeenCalled();
  });
});
