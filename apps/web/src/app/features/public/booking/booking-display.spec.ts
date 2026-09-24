import {
  applyOtpBackspace,
  applyOtpInput,
  bookingDayParts,
  companyInitials,
  formatDisplayPhone,
  formatHourLabel,
  formatServicePrice,
  localDate,
  maskBrMobile,
  serviceStepSummary,
  slotClockLabel,
  slotStepSummary,
  stepCounterLabel,
  summarizeBusinessHours,
  toE164Br,
} from './booking-display';

describe('booking-display', () => {
  const corte = { name: 'Corte', durationMinutes: 30, price: 40 };

  it('formats identity, price, hours and a selected slot', () => {
    expect(companyInitials('Estúdio Bella')).toBe('EB');
    expect(formatServicePrice(80)).toMatch(/^R\$\s*80$/);
    expect(formatServicePrice(39.9)).toMatch(/39,90/);
    expect(formatHourLabel('09:00')).toBe('9h');
    expect(formatHourLabel('09:30')).toBe('9h30');
    expect(
      summarizeBusinessHours([
        { dayOfWeek: 2, startTime: '09:00', endTime: '19:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '19:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '19:00' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '19:00' },
        { dayOfWeek: 6, startTime: '09:00', endTime: '19:00' },
      ]),
    ).toBe('Ter–Sáb, 9h às 19h');
    expect(formatDisplayPhone('+5511988887777')).toBe('(11) 98888-7777');
    expect(maskBrMobile('11988887777')).toBe('(11) 98888-7777');
    expect(toE164Br('(11) 98888-7777')).toBe('+5511988887777');
    expect(slotClockLabel('2026-09-22T13:00:00.000Z')).toBe('10:00');
    expect(localDate('2026-09-22T13:00:00.000Z')).toBe('2026-09-22');
    expect(bookingDayParts('2026-09-22')).toEqual({ weekday: 'Ter', day: '22', month: 'set' });
    expect(stepCounterLabel('slot')).toBe('Etapa 2 de 4 · Dia e horário');
    expect(serviceStepSummary(corte, false)).toMatch(/Corte · 30 min · R\$\s*40/);
    expect(slotStepSummary('2026-09-22', '2026-09-22T13:00:00.000Z', false)).toBe(
      'Ter, 22 set · 10:00',
    );
    expect(applyOtpInput('', 0, '4')).toEqual({ code: '4', focusIndex: 1 });
    expect(applyOtpInput('', 0, '492813')).toEqual({ code: '492813', focusIndex: 5 });
  });

  it('rejects empty identity, invalid times and incomplete choices', () => {
    expect(companyInitials('   ')).toBe('?');
    expect(formatHourLabel('25:99')).toBeNull();
    expect(summarizeBusinessHours([])).toBeNull();
    expect(summarizeBusinessHours([{ dayOfWeek: 1, startTime: 'xx', endTime: 'yy' }])).toBeNull();
    expect(formatDisplayPhone(null)).toBeNull();
    expect(maskBrMobile('')).toBe('');
    expect(slotClockLabel('not-a-date')).toBe('');
    expect(localDate('not-a-date')).toBe('');
    expect(bookingDayParts('2026-13-40')).toBeNull();
    expect(serviceStepSummary(null, false)).toBe('Escolha um serviço');
    expect(serviceStepSummary(corte, true)).toBe('Escolha um serviço');
    expect(slotStepSummary('2026-09-22', null, false)).toBe('Escolha o dia e o horário');
    expect(slotStepSummary('invalid', '2026-09-22T13:00:00.000Z', false)).toBe(
      'Escolha o dia e o horário',
    );
    expect(applyOtpInput('4', 0, 'abc')).toEqual({ code: '', focusIndex: 0 });
    expect(applyOtpInput('492813', 9, '1').focusIndex).toBe(0);
    expect(applyOtpBackspace('4', 1)).toEqual({ code: '', focusIndex: 0 });
    expect(applyOtpBackspace('492813', -1).code).toBe('492813');
  });
});
