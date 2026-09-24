import type { PublicServiceDto } from '@agendarhorario/contracts';
import { APP_TIMEZONE } from '@agendarhorario/utils';
import { DateTime } from 'luxon';

export type BookingAccordionStep = 'service' | 'slot' | 'data' | 'otp';

export type BookingDayParts = {
  weekday: string;
  day: string;
  month: string;
};

export type HourInterval = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const MONTH_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

const STEP_LABELS: Record<BookingAccordionStep, string> = {
  service: 'Serviço',
  slot: 'Dia e horário',
  data: 'Seus dados',
  otp: 'Confirmação',
};

const STEP_ORDER: BookingAccordionStep[] = ['service', 'slot', 'data', 'otp'];
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const BR_MOBILE_MASK = /^\(\d{2}\) \d{5}-\d{4}$/;

export const brMobileDigits = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

export const maskBrMobile = (value: string): string => {
  const digits = brMobileDigits(value);
  const ddd = digits.slice(0, 2);
  const prefix = digits.slice(2, 7);
  const suffix = digits.slice(7, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 7) return `(${ddd}) ${prefix}`;
  return `(${ddd}) ${prefix}-${suffix}`;
};

export const toE164Br = (value: string): string => `+55${brMobileDigits(value)}`;

export const companyInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

export const formatServicePrice = (price: number): string => {
  const hasCents = Math.round(price * 100) % 100 !== 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(price);
};

export const formatHourLabel = (time: string): string | null => {
  const match = CLOCK.exec(time);
  if (!match) return null;
  const hour = String(Number(match[1]));
  return match[2] === '00' ? `${hour}h` : `${hour}h${match[2]}`;
};

export const formatDisplayPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return maskBrMobile(local);
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone;
};

const rangesLabel = (intervals: HourInterval[]): string | null => {
  const labels = [...intervals]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((interval) => {
      const start = formatHourLabel(interval.startTime);
      const end = formatHourLabel(interval.endTime);
      return start && end ? `${start} às ${end}` : null;
    })
    .filter((label): label is string => label !== null);
  return labels.length > 0 ? labels.join(', ') : null;
};

export const summarizeBusinessHours = (hours: HourInterval[]): string | null => {
  const byDay = new Map<number, HourInterval[]>();
  for (const hour of hours) {
    if (hour.dayOfWeek < 0 || hour.dayOfWeek > 6) continue;
    const list = byDay.get(hour.dayOfWeek) ?? [];
    list.push(hour);
    byDay.set(hour.dayOfWeek, list);
  }

  const groups: { start: number; end: number; label: string }[] = [];
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const label = rangesLabel(byDay.get(day) ?? []);
    if (!label) continue;
    const previous = groups.at(-1);
    if (previous && previous.label === label && previous.end + 1 === day) {
      previous.end = day;
      continue;
    }
    groups.push({ start: day, end: day, label });
  }

  if (groups.length === 0) return null;
  return groups
    .map((group) => {
      const days =
        group.start === group.end
          ? WEEKDAY_SHORT[group.start]
          : `${WEEKDAY_SHORT[group.start]}–${WEEKDAY_SHORT[group.end]}`;
      return `${days}, ${group.label}`;
    })
    .join(' · ');
};

const zoned = (iso: string): DateTime =>
  DateTime.fromISO(iso, { setZone: true }).setZone(APP_TIMEZONE);

export const slotClockLabel = (iso: string): string => {
  const dt = zoned(iso);
  return dt.isValid ? dt.toFormat('HH:mm') : '';
};

export const localDate = (iso: string): string => {
  const dt = zoned(iso);
  return dt.isValid ? dt.toFormat('yyyy-MM-dd') : '';
};

export const bookingDayParts = (date: string): BookingDayParts | null => {
  const dt = DateTime.fromISO(date, { zone: APP_TIMEZONE });
  if (!dt.isValid) return null;
  const weekday = WEEKDAY_SHORT[dt.weekday % 7];
  const month = MONTH_SHORT[dt.month - 1];
  if (!weekday || !month) return null;
  return { weekday, day: dt.toFormat('d'), month };
};

export const stepCounterLabel = (step: BookingAccordionStep): string => {
  const index = STEP_ORDER.indexOf(step);
  return `Etapa ${index + 1} de 4 · ${STEP_LABELS[step]}`;
};

export const serviceStepSummary = (
  service: Pick<PublicServiceDto, 'name' | 'durationMinutes' | 'price'> | null,
  choosing: boolean,
): string => {
  if (!service || choosing) return 'Escolha um serviço';
  return `${service.name} · ${service.durationMinutes} min · ${formatServicePrice(service.price)}`;
};

export const slotStepSummary = (
  date: string | null,
  start: string | null,
  choosing: boolean,
): string => {
  if (choosing || !date || !start) return 'Escolha o dia e o horário';
  const parts = bookingDayParts(date);
  const clock = slotClockLabel(start);
  if (!parts || !clock) return 'Escolha o dia e o horário';
  return `${parts.weekday}, ${parts.day} ${parts.month} · ${clock}`;
};

const otpDigits = (current: string): string[] =>
  current
    .padEnd(6, ' ')
    .slice(0, 6)
    .split('')
    .map((char) => (/\d/.test(char) ? char : ''));

const otpCode = (digits: string[]): string =>
  digits
    .map((digit) => digit || ' ')
    .join('')
    .trimEnd();

export const applyOtpInput = (
  current: string,
  index: number,
  raw: string,
): { code: string; focusIndex: number } => {
  const digits = otpDigits(current);
  if (index < 0 || index > 5) return { code: otpCode(digits), focusIndex: 0 };
  const typed = raw.replace(/\D/g, '');
  if (!typed) {
    digits[index] = '';
    return { code: otpCode(digits), focusIndex: index };
  }
  for (let offset = 0; offset < typed.length && index + offset < 6; offset += 1) {
    digits[index + offset] = typed[offset] ?? '';
  }
  const filledUntil = Math.min(index + typed.length, 6);
  return { code: otpCode(digits), focusIndex: filledUntil >= 6 ? 5 : filledUntil };
};

export const applyOtpBackspace = (
  current: string,
  index: number,
): { code: string; focusIndex: number } => {
  const digits = otpDigits(current);
  if (index < 0 || index > 5) return { code: otpCode(digits), focusIndex: 0 };
  if (digits[index]) {
    digits[index] = '';
    return { code: otpCode(digits), focusIndex: index };
  }
  if (index === 0) return { code: otpCode(digits), focusIndex: 0 };
  digits[index - 1] = '';
  return { code: otpCode(digits), focusIndex: index - 1 };
};
