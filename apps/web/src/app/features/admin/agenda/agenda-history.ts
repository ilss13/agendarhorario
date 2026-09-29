import type { AppointmentStatus } from '@agendarhorario/contracts';
import { DAY_LABELS_PT_BR } from '@agendarhorario/contracts';
import { APP_TIMEZONE } from '@agendarhorario/utils';
import { DateTime } from 'luxon';
import { shiftAgendaMonth } from './agenda-month';

export type AgendaHistorySummary = {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

const HISTORY = new Set<AppointmentStatus>(['COMPLETED', 'CANCELLED', 'NO_SHOW']);

const zonedDay = (iso: string): DateTime | null => {
  const day = DateTime.fromISO(iso, { zone: APP_TIMEZONE });
  if (!day.isValid || day.toFormat('yyyy-MM-dd') !== iso) return null;
  return day;
};

const appointmentDay = (startsAt: string): string | null => {
  const day = DateTime.fromISO(startsAt, { setZone: true }).setZone(APP_TIMEZONE);
  return day.isValid ? day.toFormat('yyyy-MM-dd') : null;
};

export const isHistoryStatus = (status: AppointmentStatus): boolean => HISTORY.has(status);

export const canShiftHistoryMonth = (
  month: string,
  delta: number,
  todayMonth: string,
): string | null => {
  const next = shiftAgendaMonth(month, delta);
  if (!next || !/^\d{4}-\d{2}$/.test(todayMonth) || next > todayMonth) return null;
  return next;
};

export const historyDayLabel = (iso: string): string => {
  const day = zonedDay(iso);
  if (!day) return '';
  const weekday = DAY_LABELS_PT_BR[day.weekday % 7];
  const month = day.setLocale('pt-BR').toFormat('LLLL');
  return weekday ? `${weekday}, ${day.day} de ${month}` : '';
};

export const historyDetailDate = (iso: string): string => {
  const label = historyDayLabel(iso);
  const day = zonedDay(iso);
  return label && day ? `${label} de ${day.year}` : '';
};

export const historyAppointmentDate = (startsAt: string): string => {
  const iso = appointmentDay(startsAt);
  return iso ? historyDetailDate(iso) : '';
};

export const historyInitial = (name: string): string => {
  const letter = name.trim().charAt(0);
  return letter ? letter.toLocaleUpperCase('pt-BR') : '?';
};

export const summarizeHistory = (
  items: ReadonlyArray<{ status: AppointmentStatus }>,
): AgendaHistorySummary => {
  const summary: AgendaHistorySummary = { total: 0, completed: 0, cancelled: 0, noShow: 0 };
  for (const item of items) {
    if (!isHistoryStatus(item.status)) continue;
    summary.total += 1;
    if (item.status === 'COMPLETED') summary.completed += 1;
    if (item.status === 'CANCELLED') summary.cancelled += 1;
    if (item.status === 'NO_SHOW') summary.noShow += 1;
  }
  return summary;
};

export const groupHistoryByDay = <T extends { startsAt: string; status: AppointmentStatus }>(
  items: readonly T[],
): Array<{ iso: string; label: string; items: T[] }> => {
  const byDay = new Map<string, T[]>();
  for (const item of items) {
    if (!isHistoryStatus(item.status)) continue;
    const iso = appointmentDay(item.startsAt);
    if (!iso) continue;
    const list = byDay.get(iso) ?? [];
    list.push(item);
    byDay.set(iso, list);
  }
  return [...byDay.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([iso, dayItems]) => ({
      iso,
      label: historyDayLabel(iso),
      items: dayItems.slice().sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    }));
};
