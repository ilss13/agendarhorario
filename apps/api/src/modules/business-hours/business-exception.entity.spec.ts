import { BusinessException } from './business-exception.entity';

describe('BusinessException', () => {
  it('holds full-day exception fields when constructed', () => {
    const entity = new BusinessException();
    entity.id = 'ex-1';
    entity.companyId = 'company-1';
    entity.date = '2026-05-11';
    entity.fullDay = true;
    entity.startTime = null;
    entity.endTime = null;
    entity.reason = 'Feriado';

    expect(entity.fullDay).toBe(true);
    expect(entity.date).toBe('2026-05-11');
    expect(entity.reason).toBe('Feriado');
    expect(entity.startTime).toBeNull();
  });

  it('holds partial window exception fields', () => {
    const entity = new BusinessException();
    entity.fullDay = false;
    entity.startTime = '12:00';
    entity.endTime = '13:00';
    entity.reason = null;

    expect(entity.fullDay).toBe(false);
    expect(entity.startTime).toBe('12:00');
    expect(entity.endTime).toBe('13:00');
    expect(entity.reason).toBeNull();
  });
});
