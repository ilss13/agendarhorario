import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { AppDataSource } from '../apps/api/src/shared/infra/typeorm/data-source';
import { Plan } from '../apps/api/src/modules/billing/plan.entity';
import { PLAN_CATALOG } from '../apps/api/src/modules/billing/plan-catalog';

loadDotenv();

const PRICE_ENV: Record<(typeof PLAN_CATALOG)[number]['code'], string> = {
  basico: 'STRIPE_PRICE_BASICO',
  medio: 'STRIPE_PRICE_MEDIO',
  grande: 'STRIPE_PRICE_GRANDE',
  super: 'STRIPE_PRICE_SUPER',
};

async function run(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Plan);
  for (const seed of PLAN_CATALOG) {
    const stripePriceId = process.env[PRICE_ENV[seed.code]]?.trim() ?? '';
    const existing = await repo.findOne({ where: { code: seed.code } });
    if (existing) {
      existing.name = seed.name;
      existing.priceBrl = seed.priceBrl;
      existing.monthlyAppointmentLimit = seed.monthlyAppointmentLimit;
      existing.sortOrder = seed.sortOrder;
      existing.active = true;
      if (stripePriceId) existing.stripePriceId = stripePriceId;
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
