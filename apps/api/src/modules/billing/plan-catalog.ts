import type { PlanCode } from './plan.entity';

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  priceBrl: number;
  monthlyAppointmentLimit: number;
  sortOrder: number;
}

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    code: 'basico',
    name: 'Básico',
    priceBrl: 39.9,
    monthlyAppointmentLimit: 25,
    sortOrder: 1,
  },
  {
    code: 'medio',
    name: 'Médio',
    priceBrl: 79.9,
    monthlyAppointmentLimit: 50,
    sortOrder: 2,
  },
  {
    code: 'grande',
    name: 'Grande',
    priceBrl: 149.9,
    monthlyAppointmentLimit: 100,
    sortOrder: 3,
  },
  {
    code: 'super',
    name: 'Super',
    priceBrl: 249.9,
    monthlyAppointmentLimit: 250,
    sortOrder: 4,
  },
];
