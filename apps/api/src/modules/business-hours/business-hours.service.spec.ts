import { BadRequestException } from '@nestjs/common';
import { validateNoOverlap } from './business-hours.service';

describe('validateNoOverlap', () => {
  it('accepts disjoint ranges on same day', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '18:00' },
      ]),
    ).not.toThrow();
  });

  it('accepts adjacent ranges (touching boundaries)', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 2, startTime: '12:00', endTime: '18:00' },
      ]),
    ).not.toThrow();
  });

  it('rejects overlapping ranges on same day', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 3, startTime: '08:00', endTime: '12:30' },
        { dayOfWeek: 3, startTime: '12:00', endTime: '18:00' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('ignores overlap across different days', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
      ]),
    ).not.toThrow();
  });

  it('detects overlap regardless of input order', () => {
    expect(() =>
      validateNoOverlap([
        { dayOfWeek: 4, startTime: '15:00', endTime: '18:00' },
        { dayOfWeek: 4, startTime: '12:00', endTime: '16:00' },
      ]),
    ).toThrow(BadRequestException);
  });
});
