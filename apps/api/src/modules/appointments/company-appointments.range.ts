import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { APP_TIMEZONE } from '@agendarhorario/utils';

export const appointmentDayRange = (
  date: string,
  zone: string = APP_TIMEZONE,
): { start: Date; end: Date } => {
  const day = DateTime.fromISO(date, { zone });
  if (!day.isValid || day.toFormat('yyyy-MM-dd') !== date) {
    throw new BadRequestException('Data inválida');
  }
  return {
    start: day.startOf('day').toUTC().toJSDate(),
    end: day.endOf('day').toUTC().toJSDate(),
  };
};
