import { z } from 'zod';
import { uuidSchema } from './common';

export const serviceSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0),
  price: z.number().min(0),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ServiceDto = z.infer<typeof serviceSchema>;

export const createServiceRequestSchema = z.object({
  name: z.string().trim().min(2, 'Nome do serviço deve ter ao menos 2 caracteres').max(120),
  description: z.string().trim().max(500).optional().nullable(),
  durationMinutes: z
    .number({ invalid_type_error: 'Duração inválida' })
    .int()
    .min(5, 'Duração mínima de 5 minutos')
    .max(8 * 60, 'Duração máxima de 8 horas'),
  bufferMinutes: z.number().int().min(0).max(240, 'Buffer máximo de 4 horas').default(0),
  price: z.number().min(0, 'Preço não pode ser negativo').default(0),
  active: z.boolean().default(true),
});
export type CreateServiceRequest = z.infer<typeof createServiceRequestSchema>;

export const updateServiceRequestSchema = createServiceRequestSchema.partial();
export type UpdateServiceRequest = z.infer<typeof updateServiceRequestSchema>;
