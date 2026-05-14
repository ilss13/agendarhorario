import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema } from './common';

export const appointmentStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const createAppointmentRequestSchema = z.object({
  serviceId: uuidSchema,
  startsAt: z.string().datetime({ offset: true }),
  customer: z.object({
    name: z.string().trim().min(2, 'Informe um nome').max(120),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
  verificationToken: z.string().optional(),
});
export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;

export const appointmentSchema = z.object({
  id: uuidSchema,
  serviceId: uuidSchema,
  serviceName: z.string(),
  customerName: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: appointmentStatusSchema,
});
export type AppointmentDto = z.infer<typeof appointmentSchema>;
