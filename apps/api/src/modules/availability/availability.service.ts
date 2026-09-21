import { BadRequestException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { BusinessException } from '../business-hours/business-exception.entity';
import { BusinessHour } from '../business-hours/business-hour.entity';
import { Service } from '../services/service.entity';

export interface ComputeSlotsInput {
  service: Pick<Service, 'durationMinutes' | 'bufferMinutes' | 'companyId'>;
  hours: Pick<BusinessHour, 'dayOfWeek' | 'startTime' | 'endTime'>[];
  exceptions: Pick<BusinessException, 'date' | 'fullDay' | 'startTime' | 'endTime'>[];
  appointments: { startsAt: Date; endsAt: Date }[];
  timezone: string;
  /** ISO date (YYYY-MM-DD) for the day being computed */
  date: string;
  /** Reference "now" for filtering past slots; defaults to DateTime.now() */
  now?: DateTime;
  /** Minimum minutes of advance notice (default 0). */
  minAdvanceMinutes?: number;
}

export interface ComputedSlot {
  start: string;
  end: string;
}

/** Pure slot computation — no side effects. Safe to test directly. */
export const computeSlotsForDate = (input: ComputeSlotsInput): ComputedSlot[] => {
  const { service, hours, exceptions, appointments, timezone, date, minAdvanceMinutes = 0 } = input;
  const now = input.now ?? DateTime.now().setZone(timezone);
  const duration = service.durationMinutes;
  const bufferMinutes = service.bufferMinutes ?? 0;

  const dayStart = DateTime.fromISO(date, { zone: timezone });
  if (!dayStart.isValid) {
    throw new BadRequestException('Data inválida');
  }
  const dayOfWeek = dayStart.weekday === 7 ? 0 : dayStart.weekday;

  const exceptionsForDay = exceptions.filter((e) => normalizeDate(e.date) === date);
  const fullBlock = exceptionsForDay.find((e) => e.fullDay);
  if (fullBlock) return [];

  const dayHours = hours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (dayHours.length === 0) return [];

  const cutoff = now.plus({ minutes: minAdvanceMinutes });

  const partialBlocks = exceptionsForDay
    .filter((e) => !e.fullDay && e.startTime && e.endTime)
    .map((e) => ({
      start: timeToDateTime(date, e.startTime as string, timezone),
      end: timeToDateTime(date, e.endTime as string, timezone),
    }));

  const apptBlocks = appointments.map((a) => {
    const start = DateTime.fromJSDate(a.startsAt).setZone(timezone);
    const end = DateTime.fromJSDate(a.endsAt).setZone(timezone);
    return {
      start,
      // Buffer is "intervalo após": occupy until the appointment ends, then the gap.
      end: end.plus({ minutes: bufferMinutes }),
    };
  });

  const busyBlocks = [...partialBlocks, ...apptBlocks];
  const result: ComputedSlot[] = [];

  for (const window of dayHours) {
    const winStart = timeToDateTime(date, window.startTime, timezone);
    const winEnd = timeToDateTime(date, window.endTime, timezone);

    let cursor = winStart;
    let guard = 0;
    while (
      cursor.plus({ minutes: duration }).toMillis() <= winEnd.toMillis() &&
      guard++ < 24 * 60
    ) {
      const slotEnd = cursor.plus({ minutes: duration });
      if (cursor < cutoff) {
        cursor = cursor.plus({ minutes: duration });
        continue;
      }

      const blocking = busyBlocks.filter((b) => overlaps(cursor, slotEnd, b.start, b.end));
      if (blocking.length > 0) {
        const jump = blocking.reduce(
          (latest, b) => (b.end > latest ? b.end : latest),
          blocking[0]!.end,
        );
        cursor = jump > cursor ? jump : cursor.plus({ minutes: 1 });
        continue;
      }

      result.push({ start: cursor.toISO()!, end: slotEnd.toISO()! });
      cursor = slotEnd;
    }
  }

  return result;
};

/** True when two appointments' occupied ranges overlap, including after-buffer. */
export const occupiedRangesOverlap = (
  a: { startsAt: Date; endsAt: Date },
  bStart: DateTime,
  bEnd: DateTime,
  bufferMinutes: number,
  timezone: string,
): boolean => {
  const aStart = DateTime.fromJSDate(a.startsAt).setZone(timezone);
  const aOccEnd = DateTime.fromJSDate(a.endsAt).setZone(timezone).plus({ minutes: bufferMinutes });
  const bOccEnd = bEnd.plus({ minutes: bufferMinutes });
  return aStart < bOccEnd && bStart < aOccEnd;
};

const timeToDateTime = (date: string, hhmm: string, zone: string): DateTime => {
  const [h, m] = hhmm.split(':').map(Number);
  return DateTime.fromISO(date, { zone }).set({ hour: h, minute: m, second: 0, millisecond: 0 });
};

const overlaps = (aStart: DateTime, aEnd: DateTime, bStart: DateTime, bEnd: DateTime): boolean =>
  aStart < bEnd && bStart < aEnd;

const normalizeDate = (value: string | Date): string => {
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(BusinessHour)
    private readonly hours: Repository<BusinessHour>,
    @InjectRepository(BusinessException)
    private readonly exceptions: Repository<BusinessException>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  async getSlots(opts: {
    companyId: string;
    timezone: string;
    serviceId: string;
    from: string;
    to?: string;
  }): Promise<{ date: string; slots: ComputedSlot[] }[]> {
    const service = await this.services.findOne({
      where: { id: opts.serviceId, companyId: opts.companyId, active: true },
    });
    if (!service) {
      throw new BadRequestException('Serviço não encontrado');
    }

    const start = DateTime.fromISO(opts.from, { zone: opts.timezone });
    if (!start.isValid) throw new BadRequestException('Data inválida');
    const endDate = opts.to ? DateTime.fromISO(opts.to, { zone: opts.timezone }) : start;
    if (!endDate.isValid || endDate < start) {
      throw new BadRequestException('Intervalo inválido');
    }
    const diffDays = Math.min(Math.floor(endDate.diff(start, 'days').days), 30);

    const dates: string[] = [];
    for (let i = 0; i <= diffDays; i++) {
      dates.push(start.plus({ days: i }).toISODate()!);
    }

    const hours = await this.hours.find({ where: { companyId: opts.companyId } });
    const exceptions = await this.exceptions.find({
      where: { companyId: opts.companyId, date: In(dates) },
    });

    const rangeStart = start.startOf('day').toJSDate();
    const rangeEnd = endDate.endOf('day').toJSDate();
    const activeAppointments = await this.appointments.find({
      where: {
        companyId: opts.companyId,
        serviceId: opts.serviceId,
        startsAt: Between(rangeStart, rangeEnd),
        status: Not(In(['CANCELLED'] as const)),
        deletedAt: IsNull(),
      },
    });

    return dates.map((date) => ({
      date,
      slots: computeSlotsForDate({
        service,
        hours,
        exceptions,
        appointments: activeAppointments,
        timezone: opts.timezone,
        date,
      }),
    }));
  }
}
