import { exceptionDetail } from './business-exceptions.logic';

describe('exceptionDetail', () => {
  it('joins a reason with a full-day block', () => {
    expect(
      exceptionDetail({ fullDay: true, startTime: null, endTime: null, reason: 'Natal' }),
    ).toBe('Natal · Dia inteiro');
  });

  it('shows only the interval when there is no reason', () => {
    expect(
      exceptionDetail({ fullDay: false, startTime: '09:00', endTime: '12:00', reason: '  ' }),
    ).toBe('09:00–12:00');
  });

  it('rejects a partial block without both times', () => {
    expect(
      exceptionDetail({ fullDay: false, startTime: '09:00', endTime: null, reason: 'Evento' }),
    ).toBeNull();
  });
});
