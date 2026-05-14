import { MigrationInterface, QueryRunner } from 'typeorm';

export class PublicBookingSchema1715627000000 implements MigrationInterface {
  name = 'PublicBookingSchema1715627000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`customers\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`companyId\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`email\` varchar(180) NULL,
        \`phone\` varchar(20) NULL,
        \`userId\` char(36) NULL,
        \`notes\` varchar(500) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_customers_company_email\` (\`companyId\`, \`email\`),
        INDEX \`ix_customers_company_phone\` (\`companyId\`, \`phone\`),
        CONSTRAINT \`fk_customers_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`fk_customers_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`appointments\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`companyId\` char(36) NOT NULL,
        \`serviceId\` char(36) NOT NULL,
        \`customerId\` char(36) NOT NULL,
        \`startsAt\` datetime(6) NOT NULL,
        \`endsAt\` datetime(6) NOT NULL,
        \`status\` enum('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW') NOT NULL DEFAULT 'PENDING',
        \`cancelReason\` varchar(200) NULL,
        \`notificationsSent\` json NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_appointments_company_starts\` (\`companyId\`, \`startsAt\`),
        INDEX \`ix_appointments_customer\` (\`customerId\`),
        CONSTRAINT \`fk_appointments_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`fk_appointments_service\` FOREIGN KEY (\`serviceId\`) REFERENCES \`services\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`fk_appointments_customer\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`verifications\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`type\` enum('EMAIL','SMS') NOT NULL,
        \`target\` varchar(180) NOT NULL,
        \`codeHash\` varchar(128) NOT NULL,
        \`expiresAt\` datetime(6) NOT NULL,
        \`attempts\` int unsigned NOT NULL DEFAULT 0,
        \`consumedAt\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_verifications_target\` (\`type\`, \`target\`)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`appointment_action_tokens\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`appointmentId\` char(36) NOT NULL,
        \`kind\` enum('CONFIRM','CANCEL','RESCHEDULE') NOT NULL,
        \`tokenHash\` varchar(128) NOT NULL,
        \`expiresAt\` datetime(6) NOT NULL,
        \`consumedAt\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`ix_appt_action_tokens_token\` (\`tokenHash\`),
        CONSTRAINT \`fk_appt_action_tokens_appointment\` FOREIGN KEY (\`appointmentId\`) REFERENCES \`appointments\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `appointment_action_tokens`');
    await queryRunner.query('DROP TABLE `verifications`');
    await queryRunner.query('DROP TABLE `appointments`');
    await queryRunner.query('DROP TABLE `customers`');
  }
}
