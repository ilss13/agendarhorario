import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyConfigSchema1715626000000 implements MigrationInterface {
  name = 'CompanyConfigSchema1715626000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`services\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`companyId\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`description\` varchar(500) NULL,
        \`durationMinutes\` int unsigned NOT NULL,
        \`bufferMinutes\` int unsigned NOT NULL DEFAULT 0,
        \`price\` decimal(10,2) NOT NULL DEFAULT 0.00,
        \`active\` tinyint(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_services_company_active\` (\`companyId\`, \`active\`),
        CONSTRAINT \`fk_services_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`business_hours\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`companyId\` char(36) NOT NULL,
        \`dayOfWeek\` tinyint unsigned NOT NULL,
        \`startTime\` varchar(5) NOT NULL,
        \`endTime\` varchar(5) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_business_hours_company_day\` (\`companyId\`, \`dayOfWeek\`),
        CONSTRAINT \`fk_business_hours_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`business_exceptions\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`companyId\` char(36) NOT NULL,
        \`date\` date NOT NULL,
        \`fullDay\` tinyint(1) NOT NULL DEFAULT 1,
        \`startTime\` varchar(5) NULL,
        \`endTime\` varchar(5) NULL,
        \`reason\` varchar(200) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_business_exceptions_company_date\` (\`companyId\`, \`date\`),
        CONSTRAINT \`fk_business_exceptions_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `business_exceptions`');
    await queryRunner.query('DROP TABLE `business_hours`');
    await queryRunner.query('DROP TABLE `services`');
  }
}
