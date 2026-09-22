import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { BusinessException } from '../business-hours/business-exception.entity';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Service } from '../services/service.entity';
import {
  AvailabilityService,
  computeSlotsForDate,
  occupiedRangesOverlap,
} from './availability.service';

const TZ = 'America/Sao_Paulo';

const baseService = { durationMinutes: 30, bufferMinutes: 0, companyId: 'c' };
const monday = '2026-05-11';

describe('computeSlotsForDate', () => {
  const now = DateTime.fromISO('2026-05-01T00:00:00', { zone: TZ });

  it('returns empty when no business hours for that weekday', () => {
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [],
      exceptions: [],
      appointments: [],
      timezone: TZ,
      date: monday,
      now,
    });
    expect(slots).toEqual([]);
  });

  it('defaults step to service duration (30 min → no 15-min starts)', () => {
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [],
      appointments: [],
      timezone: TZ,
      date: monday,
      now,
    });
    const starts = slots.map((s) => s.start.slice(11, 16));
    expect(starts).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  it('never offers overlapping candidate starts', () => {
    const slots = computeSlotsForDate({
      service: { ...baseService, bufferMinutes: 15 },
      hours: [{ dayOfWeek: 1, startTime: '16:00', endTime: '19:00' }],
      exceptions: [],
      appointments: [],
      timezone: TZ,
      date: monday,
      now,
    });
    const times = slots.map((s) => ({
      start: DateTime.fromISO(s.start),
      end: DateTime.fromISO(s.end),
    }));
    for (let i = 0; i < times.length; i++) {
      for (let j = i + 1; j < times.length; j++) {
        expect(times[i].start < times[j].end && times[j].start < times[i].end).toBe(false);
      }
    }
  });

  it('skips full-day exception', () => {
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [{ date: monday, fullDay: true, startTime: null, endTime: null }],
      appointments: [],
      timezone: TZ,
      date: monday,
      now,
    });
    expect(slots).toEqual([]);
  });

  it('respects partial exception window', () => {
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [{ date: monday, fullDay: false, startTime: '10:00', endTime: '11:00' }],
      appointments: [],
      timezone: TZ,
      date: monday,
      now,
    });
    const starts = slots.map((s) => s.start.slice(11, 16));
    expect(starts).not.toContain('10:00');
    expect(starts).not.toContain('10:30');
    expect(starts).toContain('09:00');
    expect(starts).toContain('11:00');
  });

  it('blocks slots overlapping existing appointment', () => {
    const apptStart = DateTime.fromISO(`${monday}T10:00:00`, { zone: TZ }).toJSDate();
    const apptEnd = DateTime.fromISO(`${monday}T10:30:00`, { zone: TZ }).toJSDate();
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [],
      appointments: [{ startsAt: apptStart, endsAt: apptEnd }],
      timezone: TZ,
      date: monday,
      now,
    });
    const starts = slots.map((s) => s.start.slice(11, 16));
    expect(starts).not.toContain('10:00');
    expect(starts).toContain('09:00');
    expect(starts).toContain('10:30');
  });

  it('filters past slots based on now and minAdvanceMinutes', () => {
    const fakeNow = DateTime.fromISO(`${monday}T09:30:00`, { zone: TZ });
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [],
      appointments: [],
      timezone: TZ,
      date: monday,
      now: fakeNow,
      minAdvanceMinutes: 60,
    });
    const starts = slots.map((s) => s.start.slice(11, 16));
    expect(starts[0]).toBe('10:30');
  });

  it('offers the next start at appointment end + after-buffer (not the next 30-min tick)', () => {
    const apptStart = DateTime.fromISO(`${monday}T16:30:00`, { zone: TZ }).toJSDate();
    const apptEnd = DateTime.fromISO(`${monday}T17:00:00`, { zone: TZ }).toJSDate();
    const slots = computeSlotsForDate({
      service: { ...baseService, bufferMinutes: 15 },
      hours: [{ dayOfWeek: 1, startTime: '16:00', endTime: '19:00' }],
      exceptions: [],
      appointments: [{ startsAt: apptStart, endsAt: apptEnd }],
      timezone: TZ,
      date: monday,
      now,
    });
    const starts = slots.map((s) => s.start.slice(11, 16));
    expect(starts).toContain('16:00');
    expect(starts).not.toContain('16:30');
    expect(starts).not.toContain('17:00');
    expect(starts).toContain('17:15');
    expect(starts).not.toContain('17:30');
    expect(starts).toContain('17:45');
  });

  it('does not apply after-buffer before an existing appointment', () => {
    const apptStart = DateTime.fromISO(`${monday}T10:00:00`, { zone: TZ }).toJSDate();
    const apptEnd = DateTime.fromISO(`${monday}T10:30:00`, { zone: TZ }).toJSDate();
    const slots = computeSlotsForDate({
      service: { ...baseService, bufferMinutes: 15 },
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [],
      appointments: [{ startsAt: apptStart, endsAt: apptEnd }],
      timezone: TZ,
      date: monday,
      now,
    });
    const starts = slots.map((s) => s.start.slice(11, 16));
    expect(starts).toContain('09:00');
    expect(starts).toContain('09:30');
    expect(starts).not.toContain('10:00');
    expect(starts).not.toContain('10:30');
    expect(starts).toContain('10:45');
    expect(starts).not.toContain('11:00');
    expect(starts).toContain('11:15');
  });

  it('throws BadRequestException for invalid date', () => {
    expect(() =>
      computeSlotsForDate({
        service: baseService,
        hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
        exceptions: [],
        appointments: [],
        timezone: TZ,
        date: 'not-a-date',
        now,
      }),
    ).toThrow(BadRequestException);
  });

  it('maps Sunday (Luxon weekday 7) to dayOfWeek 0', () => {
    const sunday = '2026-05-10';
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 0, startTime: '09:00', endTime: '10:00' }],
      exceptions: [],
      appointments: [],
      timezone: TZ,
      date: sunday,
      now,
    });
    expect(slots.map((s) => s.start.slice(11, 16))).toEqual(['09:00', '09:30']);
  });

  it('normalizes exception dates provided as Date objects', () => {
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [
        {
          date: new Date(`${monday}T00:00:00.000Z`) as unknown as string,
          fullDay: true,
          startTime: null,
          endTime: null,
        },
      ],
      appointments: [],
      timezone: TZ,
      date: monday,
      now,
    });
    expect(slots).toEqual([]);
  });
});

describe('occupiedRangesOverlap', () => {
  it('detects overlap including after-buffer', () => {
    const aStart = DateTime.fromISO(`${monday}T10:00:00`, { zone: TZ });
    const aEnd = DateTime.fromISO(`${monday}T10:30:00`, { zone: TZ });
    const bStart = DateTime.fromISO(`${monday}T10:30:00`, { zone: TZ });
    const bEnd = DateTime.fromISO(`${monday}T11:00:00`, { zone: TZ });

    expect(
      occupiedRangesOverlap(
        { startsAt: aStart.toJSDate(), endsAt: aEnd.toJSDate() },
        bStart,
        bEnd,
        15,
        TZ,
      ),
    ).toBe(true);
  });

  it('returns false when ranges are disjoint beyond buffer', () => {
    const aStart = DateTime.fromISO(`${monday}T09:00:00`, { zone: TZ });
    const aEnd = DateTime.fromISO(`${monday}T09:30:00`, { zone: TZ });
    const bStart = DateTime.fromISO(`${monday}T10:00:00`, { zone: TZ });
    const bEnd = DateTime.fromISO(`${monday}T10:30:00`, { zone: TZ });

    expect(
      occupiedRangesOverlap(
        { startsAt: aStart.toJSDate(), endsAt: aEnd.toJSDate() },
        bStart,
        bEnd,
        15,
        TZ,
      ),
    ).toBe(false);
  });
});

describe('AvailabilityService', () => {
  const services = { findOne: jest.fn() };
  const hours = { find: jest.fn() };
  const exceptions = { find: jest.fn() };
  const appointments = { find: jest.fn() };

  let service: AvailabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AvailabilityService(
      services as unknown as Repository<Service>,
      hours as unknown as Repository<BusinessHour>,
      exceptions as unknown as Repository<BusinessException>,
      appointments as unknown as Repository<Appointment>,
    );
  });

  it('returns slots for a single day', async () => {
    const futureMonday = '2026-11-02';
    services.findOne.mockResolvedValue({
      id: 'svc-1',
      companyId: 'c',
      durationMinutes: 30,
      bufferMinutes: 0,
      active: true,
    });
    hours.find.mockResolvedValue([{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }]);
    exceptions.find.mockResolvedValue([]);
    appointments.find.mockResolvedValue([]);

    const result = await service.getSlots({
      companyId: 'c',
      timezone: TZ,
      serviceId: 'svc-1',
      from: futureMonday,
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.date).toBe(futureMonday);
    expect(result[0]!.slots.length).toBeGreaterThan(0);
  });

  it('returns slots across a multi-day range', async () => {
    services.findOne.mockResolvedValue({
      id: 'svc-1',
      companyId: 'c',
      durationMinutes: 30,
      bufferMinutes: 0,
      active: true,
    });
    hours.find.mockResolvedValue([]);
    exceptions.find.mockResolvedValue([]);
    appointments.find.mockResolvedValue([]);

    const result = await service.getSlots({
      companyId: 'c',
      timezone: TZ,
      serviceId: 'svc-1',
      from: '2026-11-02',
      to: '2026-11-04',
    });

    expect(result.map((d) => d.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
  });

  it('throws BadRequestException when service is missing', async () => {
    services.findOne.mockResolvedValue(null);
    await expect(
      service.getSlots({
        companyId: 'c',
        timezone: TZ,
        serviceId: 'missing',
        from: monday,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for invalid from date', async () => {
    services.findOne.mockResolvedValue({
      id: 'svc-1',
      companyId: 'c',
      durationMinutes: 30,
      bufferMinutes: 0,
      active: true,
    });
    await expect(
      service.getSlots({
        companyId: 'c',
        timezone: TZ,
        serviceId: 'svc-1',
        from: 'bad',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when to is before from', async () => {
    services.findOne.mockResolvedValue({
      id: 'svc-1',
      companyId: 'c',
      durationMinutes: 30,
      bufferMinutes: 0,
      active: true,
    });
    await expect(
      service.getSlots({
        companyId: 'c',
        timezone: TZ,
        serviceId: 'svc-1',
        from: monday,
        to: '2026-05-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
