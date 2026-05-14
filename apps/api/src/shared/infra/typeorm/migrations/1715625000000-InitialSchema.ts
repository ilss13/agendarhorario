import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1715625000000 implements MigrationInterface {
  name = 'InitialSchema1715625000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`companies\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`name\` varchar(120) NOT NULL,
        \`slug\` varchar(60) NOT NULL,
        \`phone\` varchar(20) NULL,
        \`email\` varchar(180) NULL,
        \`timezone\` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
        \`logoUrl\` varchar(500) NULL,
        \`notificationToggles\` json NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_companies_slug\` (\`slug\`)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`firebaseUid\` varchar(128) NOT NULL,
        \`email\` varchar(180) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`phone\` varchar(20) NULL,
        \`role\` enum('OWNER','STAFF','CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
        \`emailVerified\` tinyint(1) NOT NULL DEFAULT 0,
        \`phoneVerified\` tinyint(1) NOT NULL DEFAULT 0,
        \`companyId\` char(36) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`uq_users_firebase_uid\` (\`firebaseUid\`),
        UNIQUE INDEX \`uq_users_email\` (\`email\`),
        INDEX \`ix_users_company_id\` (\`companyId\`),
        CONSTRAINT \`fk_users_company\` FOREIGN KEY (\`companyId\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `users`');
    await queryRunner.query('DROP TABLE `companies`');
  }
}
