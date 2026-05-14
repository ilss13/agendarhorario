import { z } from 'zod';
import { uuidSchema } from './common';

export const availabilityQuerySchema = z.object({
  serviceId: uuidSchema,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD')
    .optional(),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const slotSchema = z.object({
  start: z.string(),
  end: z.string(),
});
export type SlotDto = z.infer<typeof slotSchema>;

export const daySlotsSchema = z.object({
  date: z.string(),
  slots: z.array(slotSchema),
});
export type DaySlotsDto = z.infer<typeof daySlotsSchema>;

export const availabilityResponseSchema = z.object({
  serviceId: uuidSchema,
  days: z.array(daySlotsSchema),
});
export type AvailabilityResponseDto = z.infer<typeof availabilityResponseSchema>;
