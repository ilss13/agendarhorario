import { DateTime } from 'luxon';
import { computeSlotsForDate } from './availability.service';

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

  it('generates 30-min slots inside a 9-12 window with step 15', () => {
    const slots = computeSlotsForDate({
      service: baseService,
      hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      exceptions: [],
      appointments: [],
      timezone: TZ,
      date: monday,
      now,
      stepMinutes: 15,
    });
    const starts = slots.map((s) => s.start.slice(11, 16));
    expect(starts[0]).toBe('09:00');
    expect(starts).toContain('09:15');
    expect(starts).toContain('11:30');
    expect(starts).not.toContain('11:45'); // 11:45 + 30 = 12:15 > 12:00
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

  it('respects buffer minutes between appointments', () => {
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
    expect(starts).not.toContain('10:30'); // 10:30 has buffer requirement vs 10:30 end
  });
});
