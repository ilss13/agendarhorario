import { z } from 'zod';
import { phoneSchema, slugSchema, uuidSchema } from './common';

export const secondaryChannelSchema = z.enum(['SMS', 'WHATSAPP', 'NONE']);
export type SecondaryChannel = z.infer<typeof secondaryChannelSchema>;

export const notificationPrefsSchema = z.object({
  email: z.boolean(),
  secondaryChannel: secondaryChannelSchema,
});
export type NotificationPrefsDto = z.infer<typeof notificationPrefsSchema>;

export const companySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  timezone: z.string(),
  logoUrl: z.string().nullable(),
  notificationPrefs: notificationPrefsSchema,
});
export type CompanyDto = z.infer<typeof companySchema>;

export const updateCompanyRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    timezone: z.string().min(1).max(64).optional(),
    notificationPrefs: notificationPrefsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Forneça pelo menos um campo para atualizar',
  });
export type UpdateCompanyRequest = z.infer<typeof updateCompanyRequestSchema>;
