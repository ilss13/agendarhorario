import type { ActionKind, AppointmentStatus } from '@agendarhorario/contracts';
import { APP_TIMEZONE } from '@agendarhorario/utils';
import { DateTime } from 'luxon';

export type ConfirmationPhase = 'confirm' | 'confirmed' | 'cancel' | 'cancelled' | 'used';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const zoned = (iso: string): DateTime =>
  DateTime.fromISO(iso, { setZone: true }).setZone(APP_TIMEZONE);

export const customerFirstName = (name: string): string => {
  const part = name.trim().split(/\s+/).find(Boolean);
  return part ?? 'cliente';
};

export const confirmationIntro = (customerName: string, companyName: string): string =>
  `Olá, ${customerFirstName(customerName)}. A ${companyName} está aguardando sua confirmação.`;

export const confirmationDateLabel = (iso: string): string => {
  const dt = zoned(iso);
  if (!dt.isValid) return '';
  const weekday = WEEKDAYS[dt.weekday % 7];
  const month = MONTHS[dt.month - 1];
  if (!weekday || !month) return '';
  return `${weekday}, ${dt.day} de ${month}`;
};

export const confirmationTimeLabel = (iso: string, durationMinutes: number): string => {
  const dt = zoned(iso);
  if (!dt.isValid || !Number.isFinite(durationMinutes) || durationMinutes < 0) return '';
  return `${dt.toFormat('HH:mm')} · ${durationMinutes} min`;
};

export const linkExpiryCopy = (expiresAtIso: string, now: DateTime): string => {
  const expires = DateTime.fromISO(expiresAtIso, { setZone: true });
  if (!expires.isValid) return 'Este link expira em breve.';
  const hours = Math.ceil(expires.diff(now, 'hours').hours);
  if (hours <= 0) return 'Este link expirou.';
  if (hours === 1) return 'Este link expira em 1 hora.';
  return `Este link expira em ${hours} horas.`;
};

export const confirmationPhase = (input: {
  kind: ActionKind;
  alreadyConsumed: boolean;
  status: AppointmentStatus;
  resultStatus: AppointmentStatus | null;
}): ConfirmationPhase => {
  const status = input.resultStatus ?? input.status;
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'CONFIRMED') return 'confirmed';
  if (input.alreadyConsumed || status === 'COMPLETED' || status === 'NO_SHOW') return 'used';
  if (input.kind === 'CANCEL') return 'cancel';
  return 'confirm';
};

const icsStamp = (iso: string): string => {
  const dt = DateTime.fromISO(iso, { setZone: true }).toUTC();
  return dt.isValid ? dt.toFormat("yyyyMMdd'T'HHmmss'Z'") : '';
};

const escapeIcs = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export const buildAppointmentIcs = (input: {
  uid: string;
  startsAt: string;
  endsAt: string;
  summary: string;
}): string | null => {
  const start = icsStamp(input.startsAt);
  const end = icsStamp(input.endsAt);
  if (!start || !end || !input.uid.trim() || !input.summary.trim()) return null;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//agendarhorario//confirmacao//PT',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(input.uid)}`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(input.summary)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};
