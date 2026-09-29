import { DateTime } from 'luxon';
import {
  agendaDayEmptyMessage,
  agendaWeekChip,
  agendaWeekContaining,
  agendaWeekMonths,
  appointmentsOnDay,
  formatAgendaDay,
  isAgendaDayOpen,
  summarizeAgendaToday,
} from './agenda-week';

const item = (
  startsAt: string,
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED',
  endsAt = '2026-09-29T15:00:00.000Z',
) => ({
  startsAt,
  endsAt,
  status,
  customerName: 'Ana',
});

describe('agenda week', () => {
  it('builds the Monday week, the open days and today summary in São Paulo', () => {
    expect(agendaWeekContaining('2026-09-29')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(agendaWeekMonths(agendaWeekContaining('2026-09-29'))).toEqual(['2026-09', '2026-10']);
    expect(agendaWeekChip('2026-09-29')).toEqual({ label: 'Ter', day: 29 });
    expect(formatAgendaDay('2026-09-21')).toBe('Segunda-feira, 21 de setembro');
    expect(
      isAgendaDayOpen(
        '2026-09-29',
        [{ dayOfWeek: 2 }],
        [{ date: '2026-09-29T00:00:00.000Z', fullDay: false }],
      ),
    ).toBe(true);
    expect(
      isAgendaDayOpen('2026-09-29', [{ dayOfWeek: 2 }], [{ date: '2026-09-29', fullDay: true }]),
    ).toBe(false);

    const listed = appointmentsOnDay(
      [
        item('2026-09-29T18:00:00.000Z', 'PENDING', '2026-09-29T18:30:00.000Z'),
        item('2026-09-29T13:00:00.000Z', 'CONFIRMED', '2026-09-29T13:30:00.000Z'),
        item('2026-09-30T13:00:00.000Z', 'CONFIRMED'),
        item('hora', 'CONFIRMED'),
      ],
      '2026-09-29',
    );
    expect(listed.map((entry) => entry.startsAt)).toEqual([
      '2026-09-29T13:00:00.000Z',
      '2026-09-29T18:00:00.000Z',
    ]);
    expect(
      summarizeAgendaToday(
        [
          item('2026-09-29T13:00:00.000Z', 'CONFIRMED', '2026-09-29T13:30:00.000Z'),
          item('2026-09-29T18:00:00.000Z', 'PENDING', '2026-09-29T18:30:00.000Z'),
          item('2026-09-29T20:00:00.000Z', 'CANCELLED', '2026-09-29T20:30:00.000Z'),
          item('2026-10-01T02:30:00.000Z', 'COMPLETED', '2026-10-01T03:00:00.000Z'),
        ],
        '2026-09-29',
        DateTime.fromISO('2026-09-29T16:00:00.000Z', { setZone: true }),
      ),
    ).toEqual({ total: 2, pending: 1, next: { time: '15:00', client: 'Ana' } });
    expect(agendaDayEmptyMessage('2026-09-29', '2026-09-29', true)).toBe(
      'Nenhum atendimento agendado para hoje.',
    );
  });

  it('rejects a bad date and a closed weekday without a remaining appointment', () => {
    expect(agendaWeekContaining('29/09/2026')).toEqual([]);
    expect(agendaWeekMonths(['nope', '2026-09-01'])).toEqual(['2026-09']);
    expect(agendaWeekChip('2026-02-31')).toBeNull();
    expect(formatAgendaDay('amanha')).toBe('');
    expect(isAgendaDayOpen('2026-09-27', [{ dayOfWeek: 1 }], [])).toBe(false);
    expect(isAgendaDayOpen('amanha', [{ dayOfWeek: 0 }], [])).toBe(false);
    expect(
      appointmentsOnDay([item('2026-10-01T02:30:00.000Z', 'CONFIRMED')], '2026-10-01'),
    ).toEqual([]);
    expect(
      summarizeAgendaToday(
        [item('2026-09-29T13:00:00.000Z', 'CONFIRMED', '2026-09-29T13:30:00.000Z')],
        '2026-09-29',
        DateTime.fromISO('2026-09-29T18:00:00.000Z', { setZone: true }),
      ),
    ).toEqual({ total: 1, pending: 0, next: null });
    expect(agendaDayEmptyMessage('2026-09-27', '2026-09-29', false)).toBe(
      'Fechado neste dia — nenhum horário disponível.',
    );
    expect(agendaDayEmptyMessage('2026-09-30', '2026-09-29', true)).toBe(
      'Nenhum atendimento agendado neste dia.',
    );
  });
});
