import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { AppDataSource } from '../apps/api/src/shared/infra/typeorm/data-source';
import { Plan, PlanCode } from '../apps/api/src/modules/billing/plan.entity';

loadDotenv();

interface PlanSeed {
  code: PlanCode;
  name: string;
  priceBrl: number;
  monthlyAppointmentLimit: number;
  envKey: string;
  sortOrder: number;
}

const SEEDS: PlanSeed[] = [
  {
    code: 'basico',
    name: 'Básico',
    priceBrl: 39.9,
    monthlyAppointmentLimit: 25,
    envKey: 'STRIPE_PRICE_BASICO',
    sortOrder: 1,
  },
  {
    code: 'medio',
    name: 'Médio',
    priceBrl: 79.9,
    monthlyAppointmentLimit: 50,
    envKey: 'STRIPE_PRICE_MEDIO',
    sortOrder: 2,
  },
  {
    code: 'grande',
    name: 'Grande',
    priceBrl: 149.9,
    monthlyAppointmentLimit: 100,
    envKey: 'STRIPE_PRICE_GRANDE',
    sortOrder: 3,
  },
  {
    code: 'super',
    name: 'Super',
    priceBrl: 249.9,
    monthlyAppointmentLimit: 250,
    envKey: 'STRIPE_PRICE_SUPER',
    sortOrder: 4,
  },
];

async function run(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Plan);
  for (const seed of SEEDS) {
    const stripePriceId = process.env[seed.envKey];
    if (!stripePriceId) {
      console.warn(`[seed-plans] pulando ${seed.code}: ${seed.envKey} não definido`);
      continue;
    }
    const existing = await repo.findOne({ where: { code: seed.code } });
    if (existing) {
      existing.name = seed.name;
      existing.priceBrl = seed.priceBrl;
      existing.monthlyAppointmentLimit = seed.monthlyAppointmentLimit;
      existing.stripePriceId = stripePriceId;
      existing.sortOrder = seed.sortOrder;
      existing.active = true;
      await repo.save(existing);
      console.log(`[seed-plans] atualizado ${seed.code}`);
    } else {
      await repo.save(
        repo.create({
          code: seed.code,
          name: seed.name,
          priceBrl: seed.priceBrl,
          monthlyAppointmentLimit: seed.monthlyAppointmentLimit,
          stripePriceId,
          sortOrder: seed.sortOrder,
          active: true,
        }),
      );
      console.log(`[seed-plans] criado ${seed.code}`);
    }
  }
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
