import {
  canShiftHistoryMonth,
  groupHistoryByDay,
  historyAppointmentDate,
  historyDayLabel,
  historyDetailDate,
  historyInitial,
  isHistoryStatus,
  summarizeHistory,
} from './agenda-history';

describe('agenda history', () => {
  it('groups past appointments by day and counts each outcome', () => {
    expect(isHistoryStatus('COMPLETED')).toBe(true);
    expect(canShiftHistoryMonth('2026-09', -1, '2026-09')).toBe('2026-08');
    expect(historyDayLabel('2026-09-14')).toBe('Segunda, 14 de setembro');
    expect(historyDetailDate('2026-09-14')).toBe('Segunda, 14 de setembro de 2026');
    expect(historyAppointmentDate('2026-10-01T02:30:00.000Z')).toBe(
      'Quarta, 30 de setembro de 2026',
    );
    expect(historyInitial(' ana ')).toBe('A');

    const groups = groupHistoryByDay([
      {
        id: 'late',
        startsAt: '2026-09-14T17:00:00.000Z',
        status: 'CANCELLED' as const,
      },
      {
        id: 'early',
        startsAt: '2026-09-14T12:00:00.000Z',
        status: 'COMPLETED' as const,
      },
      {
        id: 'older',
        startsAt: '2026-09-07T14:00:00.000Z',
        status: 'NO_SHOW' as const,
      },
      {
        id: 'ahead',
        startsAt: '2026-09-21T14:00:00.000Z',
        status: 'CONFIRMED' as const,
      },
    ]);
    expect(groups.map((group) => group.iso)).toEqual(['2026-09-14', '2026-09-07']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['early', 'late']);
    expect(
      summarizeHistory([
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'CANCELLED' },
        { status: 'NO_SHOW' },
        { status: 'PENDING' },
      ]),
    ).toEqual({ total: 4, completed: 2, cancelled: 1, noShow: 1 });
  });

  it('rejects a future month, a bad date and a name without letters', () => {
    expect(isHistoryStatus('PENDING')).toBe(false);
    expect(isHistoryStatus('CONFIRMED')).toBe(false);
    expect(canShiftHistoryMonth('2026-09', 1, '2026-09')).toBeNull();
    expect(canShiftHistoryMonth('2026-09', 1.5, '2026-09')).toBeNull();
    expect(canShiftHistoryMonth('nope', -1, '2026-09')).toBeNull();
    expect(historyDayLabel('2026-02-31')).toBe('');
    expect(historyDetailDate('amanha')).toBe('');
    expect(historyInitial('   ')).toBe('?');
    expect(groupHistoryByDay([{ startsAt: 'hora', status: 'COMPLETED' as const }])).toEqual([]);
    expect(historyAppointmentDate('hora')).toBe('');
    expect(summarizeHistory([])).toEqual({ total: 0, completed: 0, cancelled: 0, noShow: 0 });
  });
});
