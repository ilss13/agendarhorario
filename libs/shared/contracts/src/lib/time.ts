import { z } from 'zod';

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use formato HH:mm (00-23 : 00-59)');

export type TimeString = z.infer<typeof timeSchema>;

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const dayOfWeekSchema = z.number().int().min(0, 'Dia inválido').max(6, 'Dia inválido');

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const DAY_LABELS_PT_BR: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};
