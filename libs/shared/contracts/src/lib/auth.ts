import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema, slugSchema } from './common';

export const userRoleSchema = z.enum(['OWNER', 'STAFF', 'CUSTOMER']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerCompanyRequestSchema = z.object({
  company: z.object({
    name: z.string().trim().min(2, 'Nome da empresa é obrigatório').max(120),
    slug: slugSchema,
    phone: phoneSchema.optional(),
  }),
  owner: z.object({
    name: z.string().trim().min(2, 'Nome é obrigatório').max(120),
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema.optional(),
  }),
});
export type RegisterCompanyRequest = z.infer<typeof registerCompanyRequestSchema>;

export const registerCustomerRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
});
export type RegisterCustomerRequest = z.infer<typeof registerCustomerRequestSchema>;

export const meResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  companyId: z.string().uuid().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;
