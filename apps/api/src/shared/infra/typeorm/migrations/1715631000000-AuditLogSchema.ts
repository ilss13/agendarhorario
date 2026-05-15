import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogSchema1715631000000 implements MigrationInterface {
  name = 'AuditLogSchema1715631000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`audit_logs\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`actorUserId\` char(36) NULL,
        \`actorEmail\` varchar(180) NULL,
        \`companyId\` char(36) NULL,
        \`action\` varchar(40) NOT NULL,
        \`entityType\` varchar(60) NOT NULL,
        \`entityId\` varchar(60) NULL,
        \`metadata\` json NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_audit_logs_actor\` (\`actorUserId\`),
        INDEX \`ix_audit_logs_company\` (\`companyId\`, \`createdAt\`),
        INDEX \`ix_audit_logs_entity\` (\`entityType\`, \`entityId\`)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `audit_logs`');
  }
}
