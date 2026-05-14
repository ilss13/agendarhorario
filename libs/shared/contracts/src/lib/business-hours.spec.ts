import { businessExceptionInputSchema, businessHourInputSchema } from './business-hours';

describe('business-hours contracts', () => {
  it('accepts valid HH:mm range', () => {
    const result = businessHourInputSchema.safeParse({
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid HH:mm format', () => {
    const result = businessHourInputSchema.safeParse({
      dayOfWeek: 1,
      startTime: '8:0',
      endTime: '17:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects end before start', () => {
    const result = businessHourInputSchema.safeParse({
      dayOfWeek: 1,
      startTime: '17:00',
      endTime: '08:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects dayOfWeek out of range', () => {
    expect(
      businessHourInputSchema.safeParse({ dayOfWeek: 7, startTime: '08:00', endTime: '09:00' })
        .success,
    ).toBe(false);
    expect(
      businessHourInputSchema.safeParse({ dayOfWeek: -1, startTime: '08:00', endTime: '09:00' })
        .success,
    ).toBe(false);
  });

  it('businessException fullDay does not require times', () => {
    const result = businessExceptionInputSchema.safeParse({
      date: '2026-12-25',
      fullDay: true,
      reason: 'Natal',
    });
    expect(result.success).toBe(true);
  });

  it('businessException partial requires both times', () => {
    const result = businessExceptionInputSchema.safeParse({
      date: '2026-12-24',
      fullDay: false,
      startTime: '08:00',
    });
    expect(result.success).toBe(false);
  });

  it('businessException partial rejects end before start', () => {
    const result = businessExceptionInputSchema.safeParse({
      date: '2026-12-24',
      fullDay: false,
      startTime: '18:00',
      endTime: '12:00',
    });
    expect(result.success).toBe(false);
  });

  it('businessException rejects malformed date', () => {
    expect(
      businessExceptionInputSchema.safeParse({ date: '24/12/2026', fullDay: true }).success,
    ).toBe(false);
  });
});
