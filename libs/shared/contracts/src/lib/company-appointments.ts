import { z } from 'zod';
import { appointmentStatusSchema } from './appointment';
import { uuidSchema } from './common';

export const companyAppointmentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD'),
});
export type CompanyAppointmentsQuery = z.infer<typeof companyAppointmentsQuerySchema>;

export const companyAppointmentSchema = z.object({
  id: uuidSchema,
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  serviceName: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: appointmentStatusSchema,
});
export type CompanyAppointmentDto = z.infer<typeof companyAppointmentSchema>;

export const companyAppointmentsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(companyAppointmentSchema),
});
export type CompanyAppointmentsDto = z.infer<typeof companyAppointmentsSchema>;
