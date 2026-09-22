import { BusinessHour } from './business-hour.entity';

describe('BusinessHour', () => {
  it('holds weekday window fields when constructed', () => {
    const entity = new BusinessHour();
    entity.id = 'bh-1';
    entity.companyId = 'company-1';
    entity.dayOfWeek = 1;
    entity.startTime = '09:00';
    entity.endTime = '18:00';

    expect(entity.companyId).toBe('company-1');
    expect(entity.dayOfWeek).toBe(1);
    expect(entity.startTime).toBe('09:00');
    expect(entity.endTime).toBe('18:00');
  });

  it('accepts Sunday as dayOfWeek 0', () => {
    const entity = new BusinessHour();
    entity.dayOfWeek = 0;
    entity.startTime = '10:00';
    entity.endTime = '14:00';

    expect(entity.dayOfWeek).toBe(0);
  });
});
