import { z } from 'zod';

export const actionKindSchema = z.enum(['CONFIRM', 'CANCEL']);
export type ActionKind = z.infer<typeof actionKindSchema>;

export const actionPreviewSchema = z.object({
  kind: actionKindSchema,
  alreadyConsumed: z.boolean(),
  appointment: z.object({
    id: z.string().uuid(),
    serviceName: z.string(),
    companyName: z.string(),
    customerName: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
  }),
});
export type ActionPreviewDto = z.infer<typeof actionPreviewSchema>;

export const actionResultSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
});
export type ActionResultDto = z.infer<typeof actionResultSchema>;
