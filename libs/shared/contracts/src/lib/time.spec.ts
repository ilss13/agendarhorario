import { DAY_LABELS_PT_BR, dayOfWeekSchema, timeSchema, toMinutes } from './time';

describe('time contracts', () => {
  it('converts HH:mm to minutes and accepts a valid clock time', () => {
    expect(toMinutes('09:30')).toBe(9 * 60 + 30);
    expect(timeSchema.safeParse('00:00').success).toBe(true);
    expect(timeSchema.safeParse('23:59').success).toBe(true);
  });

  it('rejects an impossible clock time and a day outside 0-6', () => {
    expect(timeSchema.safeParse('24:00').success).toBe(false);
    expect(timeSchema.safeParse('9:00').success).toBe(false);
    expect(dayOfWeekSchema.safeParse(0).success).toBe(true);
    expect(dayOfWeekSchema.safeParse(6).success).toBe(true);
    expect(dayOfWeekSchema.safeParse(-1).success).toBe(false);
    expect(dayOfWeekSchema.safeParse(7).success).toBe(false);
  });

  it('labels every weekday in Portuguese', () => {
    expect(DAY_LABELS_PT_BR[0]).toBe('Domingo');
    expect(DAY_LABELS_PT_BR[6]).toBe('Sábado');
  });
});
