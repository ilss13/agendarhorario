import { DateTime } from 'luxon';
import { agendaBadge, agendaClock, todayInAgenda } from './agenda-display';

describe('agenda display', () => {
  it('marks a client-confirmed appointment with the green label', () => {
    expect(agendaBadge('CONFIRMED')).toEqual({ label: 'Confirmado', tone: 'confirmed' });
    expect(agendaClock('2026-09-23T13:00:00.000Z')).toBe('10:00');
    expect(todayInAgenda(DateTime.fromISO('2026-09-23T02:30:00.000Z', { setZone: true }))).toBe(
      '2026-09-22',
    );
  });

  it('keeps other statuses off the confirmed label and rejects a bad time', () => {
    expect(agendaBadge('PENDING').tone).toBe('pending');
    expect(agendaBadge('CANCELLED').tone).toBe('danger');
    expect(agendaBadge('COMPLETED').label).toBe('Concluído');
    expect(agendaBadge('NO_SHOW').label).toBe('Não compareceu');
    expect(agendaClock('hora')).toBe('');
  });
});
