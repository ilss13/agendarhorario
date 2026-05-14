import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email é obrigatório')
  .email('Email inválido');

export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter ao menos um número');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{10,15}$/, 'Telefone inválido (formato E.164 ou 10-15 dígitos)');

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug deve ter pelo menos 3 caracteres')
  .max(60, 'Slug deve ter no máximo 60 caracteres')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug pode conter apenas letras minúsculas, números e hífens',
  );

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedResultSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
