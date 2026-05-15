import { MigrationInterface, QueryRunner } from 'typeorm';

export class BillingSchema1715630000000 implements MigrationInterface {
  name = 'BillingSchema1715630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`companies\`
      ADD COLUMN \`stripeCustomerId\` varchar(120) NULL,
      ADD COLUMN \`stripeSubscriptionId\` varchar(120) NULL
    `);

    await queryRunner.query(`
      CREATE TABLE \`plans\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`code\` varchar(20) NOT NULL,
        \`name\` varchar(80) NOT NULL,
        \`priceBrl\` decimal(10,2) NOT NULL DEFAULT 0.00,
        \`monthlyAppointmentLimit\` int unsigned NOT NULL,
        \`stripePriceId\` varchar(120) NOT NULL,
        \`active\` tinyint(1) NOT NULL DEFAULT 1,
        \`sortOrder\` int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_plans_code\` (\`code\`)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`subscriptions\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`companyId\` char(36) NOT NULL,
        \`planId\` char(36) NOT NULL,
        \`stripeSubscriptionId\` varchar(120) NOT NULL,
        \`status\` enum('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused') NOT NULL,
        \`currentPeriodStart\` datetime(6) NOT NULL,
        \`currentPeriodEnd\` datetime(6) NOT NULL,
        \`cancelAtPeriodEnd\` tinyint(1) NOT NULL DEFAULT 0,
        \`canceledAt\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_subscriptions_company\` (\`companyId\`),
        UNIQUE INDEX \`ix_subscriptions_stripe\` (\`stripeSubscriptionId\`),
        CONSTRAINT \`fk_subscriptions_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_subscriptions_plan\` FOREIGN KEY (\`planId\`) REFERENCES \`plans\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`invoices\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`companyId\` char(36) NOT NULL,
        \`subscriptionId\` char(36) NULL,
        \`stripeInvoiceId\` varchar(120) NOT NULL,
        \`number\` varchar(80) NULL,
        \`amountTotal\` decimal(10,2) NOT NULL DEFAULT 0.00,
        \`currency\` varchar(8) NOT NULL DEFAULT 'brl',
        \`status\` enum('draft','open','paid','uncollectible','void') NOT NULL DEFAULT 'open',
        \`dueDate\` datetime(6) NULL,
        \`paidAt\` datetime(6) NULL,
        \`hostedInvoiceUrl\` varchar(500) NULL,
        \`pdfUrl\` varchar(500) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_invoices_company\` (\`companyId\`),
        UNIQUE INDEX \`ix_invoices_stripe\` (\`stripeInvoiceId\`),
        CONSTRAINT \`fk_invoices_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_invoices_subscription\` FOREIGN KEY (\`subscriptionId\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`billing_events\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`provider\` varchar(20) NOT NULL DEFAULT 'stripe',
        \`eventId\` varchar(120) NOT NULL,
        \`type\` varchar(80) NOT NULL,
        \`payload\` json NOT NULL,
        \`receivedAt\` datetime(6) NOT NULL,
        \`processedAt\` datetime(6) NULL,
        \`errorMessage\` varchar(500) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`ix_billing_events_event\` (\`eventId\`)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `billing_events`');
    await queryRunner.query('DROP TABLE `invoices`');
    await queryRunner.query('DROP TABLE `subscriptions`');
    await queryRunner.query('DROP TABLE `plans`');
    await queryRunner.query(
      'ALTER TABLE `companies` DROP COLUMN `stripeCustomerId`, DROP COLUMN `stripeSubscriptionId`',
    );
  }
}
