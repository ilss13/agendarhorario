import type { AppointmentStatus } from '@agendarhorario/contracts';
import { APP_TIMEZONE } from '@agendarhorario/utils';
import { DateTime } from 'luxon';

export type AgendaWeekChip = {
  label: string;
  day: number;
};

export type AgendaWeekStats = {
  total: number;
  pending: number;
  next: { time: string; client: string } | null;
};

const SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

const zonedDay = (iso: string): DateTime | null => {
  const day = DateTime.fromISO(iso, { zone: APP_TIMEZONE });
  if (!day.isValid || day.toFormat('yyyy-MM-dd') !== iso) return null;
  return day;
};

const appointmentDay = (startsAt: string): string | null => {
  const day = DateTime.fromISO(startsAt, { setZone: true }).setZone(APP_TIMEZONE);
  return day.isValid ? day.toFormat('yyyy-MM-dd') : null;
};

export const agendaWeekContaining = (iso: string): string[] => {
  const day = zonedDay(iso);
  if (!day) return [];
  const monday = day.minus({ days: day.weekday - 1 });
  return Array.from({ length: 7 }, (_, index) =>
    monday.plus({ days: index }).toFormat('yyyy-MM-dd'),
  );
};

export const agendaWeekMonths = (days: readonly string[]): string[] => {
  const months: string[] = [];
  for (const iso of days) {
    const month = iso.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month) && !months.includes(month)) months.push(month);
  }
  return months;
};

export const agendaWeekChip = (iso: string): AgendaWeekChip | null => {
  const day = zonedDay(iso);
  if (!day) return null;
  const label = SHORT[day.weekday % 7];
  return label ? { label, day: day.day } : null;
};

export const formatAgendaDay = (iso: string): string => {
  const day = zonedDay(iso);
  if (!day) return '';
  const label = day.setLocale('pt-BR').toFormat("cccc, d 'de' LLLL");
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
};

export const isAgendaDayOpen = (
  iso: string,
  hours: ReadonlyArray<{ dayOfWeek: number }>,
  exceptions: ReadonlyArray<{ date: string; fullDay: boolean }>,
): boolean => {
  const day = zonedDay(iso);
  if (!day) return false;
  const closed = exceptions.some((item) => item.fullDay && item.date.slice(0, 10) === iso);
  if (closed) return false;
  return hours.some((hour) => hour.dayOfWeek === day.weekday % 7);
};

export const appointmentsOnDay = <T extends { startsAt: string }>(
  items: readonly T[],
  iso: string,
): T[] =>
  items
    .filter((item) => appointmentDay(item.startsAt) === iso)
    .slice()
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

export const summarizeAgendaToday = (
  items: ReadonlyArray<{
    startsAt: string;
    endsAt: string;
    status: AppointmentStatus;
    customerName: string;
  }>,
  today: string,
  now: DateTime = DateTime.now(),
): AgendaWeekStats => {
  const todays = appointmentsOnDay(items, today);
  const active = todays.filter((item) => item.status !== 'CANCELLED');
  const instant = now.setZone(APP_TIMEZONE);
  const next = active.find((item) => {
    const ends = DateTime.fromISO(item.endsAt, { setZone: true }).setZone(APP_TIMEZONE);
    return ends.isValid && ends > instant;
  });
  return {
    total: active.length,
    pending: todays.filter((item) => item.status === 'PENDING').length,
    next: next
      ? {
          time: DateTime.fromISO(next.startsAt, { setZone: true })
            .setZone(APP_TIMEZONE)
            .toFormat('HH:mm'),
          client: next.customerName,
        }
      : null,
  };
};

export const agendaDayEmptyMessage = (iso: string, today: string, open: boolean): string => {
  if (!open) return 'Fechado neste dia — nenhum horário disponível.';
  if (iso === today) return 'Nenhum atendimento agendado para hoje.';
  return 'Nenhum atendimento agendado neste dia.';
};
