import { z } from 'zod';
import { emailSchema, phoneSchema } from './common';

export const verificationChannelSchema = z.enum(['EMAIL', 'SMS']);
export type VerificationChannel = z.infer<typeof verificationChannelSchema>;

export const requestVerificationSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
});
export type RequestVerificationRequest = z.infer<typeof requestVerificationSchema>;

export const requestVerificationResponseSchema = z.object({
  channel: verificationChannelSchema,
  target: z.string(),
});
export type RequestVerificationResponse = z.infer<typeof requestVerificationResponseSchema>;

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
