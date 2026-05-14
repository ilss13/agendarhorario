import { z } from 'zod';
import { uuidSchema } from './common';
import { dayOfWeekSchema, timeSchema, toMinutes } from './time';

export const businessHourSchema = z.object({
  id: uuidSchema,
  dayOfWeek: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
});
export type BusinessHourDto = z.infer<typeof businessHourSchema>;

export const businessHourInputSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((value) => toMinutes(value.endTime) > toMinutes(value.startTime), {
    message: 'Hora de fim deve ser maior que hora de início',
    path: ['endTime'],
  });
export type BusinessHourInput = z.infer<typeof businessHourInputSchema>;

export const replaceBusinessHoursRequestSchema = z.object({
  hours: z.array(businessHourInputSchema).max(7 * 8, 'Excesso de intervalos'),
});
export type ReplaceBusinessHoursRequest = z.infer<typeof replaceBusinessHoursRequestSchema>;

export const businessExceptionSchema = z.object({
  id: uuidSchema,
  date: z.string(),
  fullDay: z.boolean(),
  startTime: timeSchema.nullable(),
  endTime: timeSchema.nullable(),
  reason: z.string().nullable(),
});
export type BusinessExceptionDto = z.infer<typeof businessExceptionSchema>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

export const businessExceptionInputSchema = z
  .object({
    date: dateOnly,
    fullDay: z.boolean().default(true),
    startTime: timeSchema.nullable().optional(),
    endTime: timeSchema.nullable().optional(),
    reason: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.fullDay) return;
    if (!value.startTime || !value.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'Informe início e fim quando não for dia inteiro',
      });
      return;
    }
    if (toMinutes(value.endTime) <= toMinutes(value.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'Hora de fim deve ser maior que hora de início',
      });
    }
  });
export type BusinessExceptionInput = z.infer<typeof businessExceptionInputSchema>;
