import { z } from 'zod';
import { uuidSchema } from './common';
import { businessHourSchema } from './business-hours';

export const publicServiceSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0),
  price: z.number().min(0),
});
export type PublicServiceDto = z.infer<typeof publicServiceSchema>;

export const publicCompanySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  phone: z.string().nullable(),
  timezone: z.string(),
  logoUrl: z.string().nullable(),
  businessHours: z.array(businessHourSchema),
  services: z.array(publicServiceSchema),
});
export type PublicCompanyDto = z.infer<typeof publicCompanySchema>;
