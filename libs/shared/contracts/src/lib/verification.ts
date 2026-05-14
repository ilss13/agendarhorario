import { z } from 'zod';
import { emailSchema, phoneSchema } from './common';

export const verificationChannelSchema = z.enum(['EMAIL', 'SMS']);
export type VerificationChannel = z.infer<typeof verificationChannelSchema>;

export const requestVerificationSchema = z
  .object({
    channel: verificationChannelSchema,
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.channel === 'EMAIL' && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Informe um e-mail para receber o código',
      });
    }
    if (value.channel === 'SMS' && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Informe um telefone para receber o código',
      });
    }
  });
export type RequestVerificationRequest = z.infer<typeof requestVerificationSchema>;

export const confirmVerificationSchema = z.object({
  channel: verificationChannelSchema,
  target: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'O código tem 6 dígitos'),
});
export type ConfirmVerificationRequest = z.infer<typeof confirmVerificationSchema>;

export const verificationTokenResponseSchema = z.object({
  verificationToken: z.string(),
  channel: verificationChannelSchema,
  target: z.string(),
  expiresAt: z.string(),
});
export type VerificationTokenResponse = z.infer<typeof verificationTokenResponseSchema>;
