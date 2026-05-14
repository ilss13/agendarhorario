import { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined): string | null =>
    value === null || value === undefined ? null : value.toFixed(2),
  from: (value: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
