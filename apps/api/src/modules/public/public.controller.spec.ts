import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { CreateAppointmentRequest } from '@agendarhorario/contracts';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../availability/availability.service';
import { BillingService } from '../billing/billing.service';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Company } from '../companies/company.entity';
import { Service } from '../services/service.entity';
import { PublicCompaniesController } from './public.controller';

describe('PublicCompaniesController', () => {
  const companies = { findOne: jest.fn() };
  const services = { find: jest.fn() };
  const hours = { find: jest.fn() };
  const availability = { getSlots: jest.fn() };
  const appointments = { createForPublicBooking: jest.fn() };
  const billing = { canBookForCompany: jest.fn() };

  let controller: PublicCompaniesController;

  const company = {
    id: 'company-1',
    name: 'Barbearia',
    slug: 'barbearia',
    phone: '+5511999999999',
    timezone: 'America/Sao_Paulo',
    logoUrl: null,
  } as Company;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PublicCompaniesController(
      companies as unknown as Repository<Company>,
      services as unknown as Repository<Service>,
      hours as unknown as Repository<BusinessHour>,
      availability as unknown as AvailabilityService,
      appointments as unknown as AppointmentsService,
      billing as unknown as BillingService,
    );
  });

  describe('getBySlug', () => {
    it('returns public company payload when available', async () => {
      companies.findOne.mockResolvedValue(company);
      services.find.mockResolvedValue([
        {
          id: 'svc-1',
          name: 'Corte',
          description: null,
          durationMinutes: 30,
          bufferMinutes: 0,
          price: '40.00',
        },
      ]);
      hours.find.mockResolvedValue([
        { id: 'bh-1', dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
      ]);
      billing.canBookForCompany.mockResolvedValue({
        state: 'AVAILABLE',
        used: 1,
        limit: 100,
        resetAt: null,
      });

      await expect(controller.getBySlug('barbearia')).resolves.toMatchObject({
        id: 'company-1',
        slug: 'barbearia',
        status: 'AVAILABLE',
        statusReason: null,
        services: [{ id: 'svc-1', price: 40 }],
        businessHours: [{ id: 'bh-1', dayOfWeek: 1 }],
      });
    });

    it('maps OVER_LIMIT status with reset reason', async () => {
      companies.findOne.mockResolvedValue(company);
      services.find.mockResolvedValue([]);
      hours.find.mockResolvedValue([]);
      const resetAt = new Date('2026-06-01T00:00:00.000Z');
      billing.canBookForCompany.mockResolvedValue({
        state: 'OVER_LIMIT',
        used: 50,
        limit: 50,
        resetAt,
      });

      const result = await controller.getBySlug('barbearia');
      expect(result.status).toBe('OVER_LIMIT');
      expect(result.statusReason).toContain(resetAt.toISOString());
    });

    it('maps OVER_LIMIT without resetAt using dash placeholder', async () => {
      companies.findOne.mockResolvedValue(company);
      services.find.mockResolvedValue([]);
      hours.find.mockResolvedValue([]);
      billing.canBookForCompany.mockResolvedValue({
        state: 'OVER_LIMIT',
        used: 50,
        limit: 50,
        resetAt: null,
      });

      const result = await controller.getBySlug('barbearia');
      expect(result.statusReason).toContain('—');
    });

    it('maps non-available non-over-limit states to SUSPENDED', async () => {
      companies.findOne.mockResolvedValue(company);
      services.find.mockResolvedValue([]);
      hours.find.mockResolvedValue([]);
      billing.canBookForCompany.mockResolvedValue({
        state: 'NO_SUBSCRIPTION',
        used: 0,
        limit: 0,
        resetAt: null,
      });

      const result = await controller.getBySlug('barbearia');
      expect(result.status).toBe('SUSPENDED');
      expect(result.statusReason).toContain('indisponível');
    });

    it('throws NotFoundException when slug is unknown', async () => {
      companies.findOne.mockResolvedValue(null);
      await expect(controller.getBySlug('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('availabilityForSlug', () => {
    it('returns availability days for the company', async () => {
      companies.findOne.mockResolvedValue(company);
      availability.getSlots.mockResolvedValue([
        { date: '2026-05-11', slots: [{ start: 'a', end: 'b' }] },
      ]);

      await expect(
        controller.availabilityForSlug('barbearia', {
          serviceId: '11111111-1111-4111-8111-111111111111',
          from: '2026-05-11',
        }),
      ).resolves.toEqual({
        serviceId: '11111111-1111-4111-8111-111111111111',
        days: [{ date: '2026-05-11', slots: [{ start: 'a', end: 'b' }] }],
      });
    });

    it('throws NotFoundException when company is missing', async () => {
      companies.findOne.mockResolvedValue(null);
      await expect(
        controller.availabilityForSlug('missing', {
          serviceId: '11111111-1111-4111-8111-111111111111',
          from: '2026-05-11',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAppointment', () => {
    it('delegates to appointments service', async () => {
      const input = {
        serviceId: '11111111-1111-4111-8111-111111111111',
        startsAt: '2026-05-11T12:00:00.000-03:00',
        customer: {
          name: 'Ana',
          email: 'ana@example.com',
          phone: '+5511999999999',
        },
      } as CreateAppointmentRequest;
      appointments.createForPublicBooking.mockResolvedValue({
        id: 'appt-1',
        status: 'PENDING',
      });

      await expect(controller.createAppointment('barbearia', input)).resolves.toMatchObject({
        id: 'appt-1',
      });
      expect(appointments.createForPublicBooking).toHaveBeenCalledWith('barbearia', input);
    });

    it('propagates booking failures', async () => {
      appointments.createForPublicBooking.mockRejectedValue(new Error('quota'));
      await expect(
        controller.createAppointment('barbearia', {
          serviceId: '11111111-1111-4111-8111-111111111111',
          startsAt: '2026-05-11T12:00:00.000-03:00',
          customer: { name: 'Ana', email: 'a@b.com', phone: '+5511999999999' },
        }),
      ).rejects.toThrow('quota');
    });
  });
});
