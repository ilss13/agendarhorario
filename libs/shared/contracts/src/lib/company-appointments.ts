import { z } from 'zod';
import { appointmentStatusSchema } from './appointment';
import { uuidSchema } from './common';

const agendaDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD');

const agendaMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe o mês no formato AAAA-MM');

export const companyAppointmentsQuerySchema = z
  .object({
    date: agendaDateSchema.optional(),
    month: agendaMonthSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.date) === Boolean(value.month)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe a data ou o mês',
        path: ['date'],
      });
    }
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

const companyAppointmentItemsSchema = z.array(companyAppointmentSchema);

export const companyAppointmentsSchema = z.object({
  date: agendaDateSchema,
  items: companyAppointmentItemsSchema,
});
export type CompanyAppointmentsDto = z.infer<typeof companyAppointmentsSchema>;

export const companyAppointmentsMonthSchema = z.object({
  month: agendaMonthSchema,
  items: companyAppointmentItemsSchema,
});
export type CompanyAppointmentsMonthDto = z.infer<typeof companyAppointmentsMonthSchema>;
