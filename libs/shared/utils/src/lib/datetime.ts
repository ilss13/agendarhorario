import { DateTime } from 'luxon';

export const APP_TIMEZONE = 'America/Sao_Paulo';

export const nowInAppTz = (): DateTime => DateTime.now().setZone(APP_TIMEZONE);

export const startOfDayInAppTz = (date: Date | string | DateTime): DateTime => {
  const dt =
    date instanceof DateTime
      ? date.setZone(APP_TIMEZONE)
      : typeof date === 'string'
        ? DateTime.fromISO(date, { zone: APP_TIMEZONE })
        : DateTime.fromJSDate(date).setZone(APP_TIMEZONE);
  return dt.startOf('day');
};

export const isPast = (date: Date | string | DateTime): boolean => {
  const dt =
    date instanceof DateTime
      ? date
      : typeof date === 'string'
        ? DateTime.fromISO(date)
        : DateTime.fromJSDate(date);
  return dt < DateTime.now();
};

export const isWithinAdvanceWindow = (
  date: Date | string | DateTime,
  minMinutesAhead: number,
  maxDaysAhead: number,
): { ok: true } | { ok: false; reason: 'TOO_SOON' | 'TOO_FAR' } => {
  const dt =
    date instanceof DateTime
      ? date.setZone(APP_TIMEZONE)
      : typeof date === 'string'
        ? DateTime.fromISO(date, { zone: APP_TIMEZONE })
        : DateTime.fromJSDate(date).setZone(APP_TIMEZONE);
  const now = nowInAppTz();
  const minDiff = dt.diff(now, 'minutes').minutes;
  const maxDiff = dt.diff(now, 'days').days;
  if (minDiff < minMinutesAhead) return { ok: false, reason: 'TOO_SOON' };
  if (maxDiff > maxDaysAhead) return { ok: false, reason: 'TOO_FAR' };
  return { ok: true };
};

export const rangeOverlaps = (
  aStart: DateTime,
  aEnd: DateTime,
  bStart: DateTime,
  bEnd: DateTime,
): boolean => aStart < bEnd && bStart < aEnd;

export const formatBrDateTime = (date: Date | string | DateTime): string => {
  const dt =
    date instanceof DateTime
      ? date.setZone(APP_TIMEZONE)
      : typeof date === 'string'
        ? DateTime.fromISO(date, { zone: APP_TIMEZONE })
        : DateTime.fromJSDate(date).setZone(APP_TIMEZONE);
  return dt.setLocale('pt-BR').toFormat('dd/MM/yyyy HH:mm');
};
