import type { AppointmentStatus } from '@agendarhorario/contracts';
import { APP_TIMEZONE } from '@agendarhorario/utils';
import { DateTime } from 'luxon';

export type AgendaMonthCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

export type AgendaMonthSummary = {
  total: number;
  confirmed: number;
  pending: number;
  openDays: number;
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const zonedMonth = (month: string): DateTime | null => {
  if (!MONTH.test(month)) return null;
  const start = DateTime.fromISO(`${month}-01`, { zone: APP_TIMEZONE });
  if (!start.isValid || start.toFormat('yyyy-MM') !== month) return null;
  return start;
};

const counted = (status: AppointmentStatus): boolean => status !== 'CANCELLED';

export const currentAgendaMonth = (now: DateTime = DateTime.now()): string =>
  now.setZone(APP_TIMEZONE).toFormat('yyyy-MM');

export const formatAgendaMonth = (month: string): string => {
  const start = zonedMonth(month);
  if (!start) return '';
  const label = start.setLocale('pt-BR').toFormat('LLLL yyyy');
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
};

export const shiftAgendaMonth = (month: string, delta: number): string | null => {
  const start = zonedMonth(month);
  if (!start || !Number.isInteger(delta)) return null;
  return start.plus({ months: delta }).toFormat('yyyy-MM');
};

export const buildAgendaMonthGrid = (month: string, today: string): AgendaMonthCell[] => {
  const start = zonedMonth(month);
  if (!start) return [];
  const gridStart = start.minus({ days: start.weekday - 1 });
  const end = start.endOf('month').startOf('day');
  const gridEnd = end.plus({ days: end.weekday === 7 ? 0 : 7 - end.weekday });
  const cells: AgendaMonthCell[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = cursor.plus({ days: 1 })) {
    const iso = cursor.toFormat('yyyy-MM-dd');
    cells.push({
      iso,
      day: cursor.day,
      inMonth: cursor.month === start.month && cursor.year === start.year,
      isToday: iso === today,
    });
  }
  return cells;
};

export const openAppointmentCounts = (
  items: ReadonlyArray<{ startsAt: string; status: AppointmentStatus }>,
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!counted(item.status)) continue;
    const day = DateTime.fromISO(item.startsAt, { setZone: true }).setZone(APP_TIMEZONE);
    if (!day.isValid) continue;
    const iso = day.toFormat('yyyy-MM-dd');
    counts[iso] = (counts[iso] ?? 0) + 1;
  }
  return counts;
};

export const summarizeAgendaMonth = (
  items: ReadonlyArray<{ startsAt: string; status: AppointmentStatus }>,
): AgendaMonthSummary => {
  const counts = openAppointmentCounts(items);
  let confirmed = 0;
  let pending = 0;
  let total = 0;
  for (const item of items) {
    if (!counted(item.status)) continue;
    const day = DateTime.fromISO(item.startsAt, { setZone: true }).setZone(APP_TIMEZONE);
    if (!day.isValid) continue;
    total += 1;
    if (item.status === 'CONFIRMED') confirmed += 1;
    if (item.status === 'PENDING') pending += 1;
  }
  return {
    total,
    confirmed,
    pending,
    openDays: Object.keys(counts).length,
  };
};

export const agendaDayLabel = (cell: AgendaMonthCell, count: number): string => {
  const when = DateTime.fromISO(cell.iso, { zone: APP_TIMEZONE });
  const label = when.isValid ? when.setLocale('pt-BR').toFormat('d LLLL') : cell.iso;
  const parts = [label];
  if (cell.isToday) parts.push('hoje');
  if (!cell.inMonth) parts.push('fora do mês');
  if (count === 1) parts.push('1 agendamento');
  if (count > 1) parts.push(`${count} agendamentos`);
  return parts.join(', ');
};
