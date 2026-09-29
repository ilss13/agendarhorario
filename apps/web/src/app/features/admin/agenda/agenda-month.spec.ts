import { DateTime } from 'luxon';
import {
  agendaDayLabel,
  buildAgendaMonthGrid,
  currentAgendaMonth,
  formatAgendaMonth,
  openAppointmentCounts,
  shiftAgendaMonth,
  summarizeAgendaMonth,
} from './agenda-month';

describe('agenda month', () => {
  const confirmed = {
    startsAt: '2026-09-21T13:00:00.000Z',
    status: 'CONFIRMED' as const,
  };
  const pending = {
    startsAt: '2026-09-21T18:00:00.000Z',
    status: 'PENDING' as const,
  };

  it('builds a Monday-first grid and summarizes open days in São Paulo', () => {
    const cells = buildAgendaMonthGrid('2026-09', '2026-09-21');
    expect(cells[0]).toEqual({ iso: '2026-08-31', day: 31, inMonth: false, isToday: false });
    expect(cells.find((cell) => cell.iso === '2026-09-01')?.inMonth).toBe(true);
    expect(cells.find((cell) => cell.iso === '2026-09-21')?.isToday).toBe(true);
    expect(cells.at(-1)?.iso).toBe('2026-10-04');
    expect(formatAgendaMonth('2026-09')).toBe('Setembro 2026');
    expect(shiftAgendaMonth('2026-09', 1)).toBe('2026-10');
    expect(
      currentAgendaMonth(DateTime.fromISO('2026-10-01T02:30:00.000Z', { setZone: true })),
    ).toBe('2026-09');

    const counts = openAppointmentCounts([
      confirmed,
      pending,
      { startsAt: '2026-10-01T02:30:00.000Z', status: 'COMPLETED' },
      { startsAt: '2026-09-22T15:00:00.000Z', status: 'CANCELLED' },
      { startsAt: 'hora', status: 'CONFIRMED' },
    ]);
    expect(counts).toEqual({ '2026-09-21': 2, '2026-09-30': 1 });
    expect(
      summarizeAgendaMonth([
        confirmed,
        pending,
        { startsAt: '2026-10-01T02:30:00.000Z', status: 'COMPLETED' },
        { startsAt: '2026-09-22T15:00:00.000Z', status: 'CANCELLED' },
      ]),
    ).toEqual({ total: 3, confirmed: 1, pending: 1, openDays: 2 });
    expect(agendaDayLabel(cells.find((cell) => cell.iso === '2026-09-21')!, 2)).toContain(
      '2 agendamentos',
    );
  });

  it('rejects a month that is not AAAA-MM and a non-integer shift', () => {
    expect(buildAgendaMonthGrid('2026-13', '2026-09-21')).toEqual([]);
    expect(formatAgendaMonth('09/2026')).toBe('');
    expect(shiftAgendaMonth('2026-09', 1.5)).toBeNull();
    expect(shiftAgendaMonth('nope', 1)).toBeNull();
    expect(openAppointmentCounts([])).toEqual({});
    expect(summarizeAgendaMonth([{ startsAt: 'hora', status: 'PENDING' }])).toEqual({
      total: 0,
      confirmed: 0,
      pending: 0,
      openDays: 0,
    });
    expect(
      agendaDayLabel({ iso: '2026-08-31', day: 31, inMonth: false, isToday: false }, 1),
    ).toContain('fora do mês');
  });
});
