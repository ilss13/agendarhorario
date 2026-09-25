import { PUBLIC_PLAN_OFFERS } from '@agendarhorario/contracts';
import type { PlanCode } from './plan.entity';

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  priceBrl: number;
  monthlyAppointmentLimit: number;
  sortOrder: number;
}

export const PLAN_CATALOG: PlanDefinition[] = PUBLIC_PLAN_OFFERS.map((plan) => ({ ...plan }));
