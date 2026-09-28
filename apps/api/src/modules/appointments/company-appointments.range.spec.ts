import { BadRequestException } from '@nestjs/common';
import { appointmentDayRange } from './company-appointments.range';

describe('appointmentDayRange', () => {
  it('returns the São Paulo day bounds in UTC', () => {
    const range = appointmentDayRange('2026-09-23');
    expect(range.start.toISOString()).toBe('2026-09-23T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-09-24T02:59:59.999Z');
  });

  it('rejects a calendar date that does not exist', () => {
    expect(() => appointmentDayRange('2026-02-31')).toThrow(BadRequestException);
    expect(() => appointmentDayRange('23-09-2026')).toThrow(BadRequestException);
  });
});
