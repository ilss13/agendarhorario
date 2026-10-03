import { DateTime } from 'luxon';
import {
  APP_TIMEZONE,
  formatBrDateTime,
  isPast,
  isWithinAdvanceWindow,
  rangeOverlaps,
  startOfDayInAppTz,
} from './datetime';

describe('datetime utils', () => {
  it('startOfDayInAppTz returns midnight in app timezone', () => {
    const result = startOfDayInAppTz('2026-05-13T15:30:00Z');
    expect(result.zoneName).toBe(APP_TIMEZONE);
    expect(result.hour).toBe(0);
    expect(result.minute).toBe(0);
    expect(startOfDayInAppTz(result).toISODate()).toBe(result.toISODate());
    expect(startOfDayInAppTz(new Date('2026-05-13T15:30:00Z')).hour).toBe(0);
  });

  it('isPast returns true for dates before now', () => {
    expect(isPast(DateTime.now().minus({ hours: 1 }))).toBe(true);
    expect(isPast(DateTime.now().plus({ hours: 1 }))).toBe(false);
    expect(isPast('2000-01-01T00:00:00Z')).toBe(true);
    expect(isPast(new Date('2000-01-01T00:00:00Z'))).toBe(true);
  });

  it('isWithinAdvanceWindow enforces min advance', () => {
    const inThirtyMin = DateTime.now().plus({ minutes: 30 });
    expect(isWithinAdvanceWindow(inThirtyMin, 60, 90)).toEqual({
      ok: false,
      reason: 'TOO_SOON',
    });
  });

  it('isWithinAdvanceWindow enforces max advance', () => {
    const inHundredDays = DateTime.now().plus({ days: 100 });
    expect(isWithinAdvanceWindow(inHundredDays, 60, 90)).toEqual({
      ok: false,
      reason: 'TOO_FAR',
    });
  });

  it('isWithinAdvanceWindow accepts within range', () => {
    const inTwoHours = DateTime.now().plus({ hours: 2 });
    expect(isWithinAdvanceWindow(inTwoHours, 60, 90)).toEqual({ ok: true });
    expect(isWithinAdvanceWindow(inTwoHours.toISO() ?? '', 60, 90)).toEqual({ ok: true });
    expect(isWithinAdvanceWindow(inTwoHours.toJSDate(), 60, 90)).toEqual({ ok: true });
  });

  it('rangeOverlaps detects overlapping ranges', () => {
    const a = DateTime.fromISO('2026-05-13T10:00:00');
    const b = DateTime.fromISO('2026-05-13T11:00:00');
    const c = DateTime.fromISO('2026-05-13T10:30:00');
    const d = DateTime.fromISO('2026-05-13T11:30:00');
    expect(rangeOverlaps(a, b, c, d)).toBe(true);
    expect(rangeOverlaps(a, b, b, d)).toBe(false);
    expect(rangeOverlaps(d, d.plus({ hours: 1 }), a, b)).toBe(false);
  });

  it('formatBrDateTime formats in pt-BR', () => {
    const result = formatBrDateTime('2026-05-13T15:30:00-03:00');
    expect(result).toBe('13/05/2026 15:30');
    expect(formatBrDateTime(DateTime.fromISO('2026-05-13T15:30:00-03:00'))).toBe(result);
    expect(formatBrDateTime(new Date('2026-05-13T18:30:00Z'))).toBe(result);
  });
});
