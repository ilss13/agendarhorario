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
});
