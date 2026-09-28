import type { AppointmentStatus } from '@agendarhorario/contracts';
import { APP_TIMEZONE } from '@agendarhorario/utils';
import { DateTime } from 'luxon';

export type AgendaBadge = {
  label: string;
  tone: 'confirmed' | 'pending' | 'muted' | 'danger';
};

const zoned = (iso: string): DateTime =>
  DateTime.fromISO(iso, { setZone: true }).setZone(APP_TIMEZONE);

export const agendaBadge = (status: AppointmentStatus): AgendaBadge => {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Confirmado', tone: 'confirmed' };
    case 'PENDING':
      return { label: 'Aguardando confirmação', tone: 'pending' };
    case 'CANCELLED':
      return { label: 'Cancelado', tone: 'danger' };
    case 'COMPLETED':
      return { label: 'Concluído', tone: 'muted' };
    case 'NO_SHOW':
      return { label: 'Não compareceu', tone: 'muted' };
  }
};

export const agendaClock = (iso: string): string => {
  const dt = zoned(iso);
  return dt.isValid ? dt.toFormat('HH:mm') : '';
};

export const todayInAgenda = (now: DateTime = DateTime.now()): string =>
  now.setZone(APP_TIMEZONE).toFormat('yyyy-MM-dd');
