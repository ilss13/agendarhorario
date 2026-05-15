import { z } from 'zod';
import { appointmentStatusSchema } from './appointment';
import { uuidSchema } from './common';

export const myAppointmentSchema = z.object({
  id: uuidSchema,
  companyName: z.string(),
  companySlug: z.string(),
  serviceId: uuidSchema,
  serviceName: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: appointmentStatusSchema,
});
export type MyAppointmentDto = z.infer<typeof myAppointmentSchema>;

export const myAppointmentsQuerySchema = z.object({
  range: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type MyAppointmentsQuery = z.infer<typeof myAppointmentsQuerySchema>;

export const rescheduleRequestSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
});
export type RescheduleRequest = z.infer<typeof rescheduleRequestSchema>;

export const cancelRequestSchema = z.object({
  reason: z.string().trim().max(200).optional().nullable(),
});
export type CancelRequest = z.infer<typeof cancelRequestSchema>;
