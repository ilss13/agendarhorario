import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationLog1715629000000 implements MigrationInterface {
  name = 'NotificationLog1715629000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notification_logs\` (
        \`id\` char(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deletedAt\` datetime(6) NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`appointmentId\` char(36) NOT NULL,
        \`channel\` enum('EMAIL','SMS','WHATSAPP') NOT NULL,
        \`kind\` enum('CREATED','CONFIRMED','CANCELLED','REMINDER_24H','REMINDER_1H') NOT NULL,
        \`status\` enum('SENT','FAILED','SKIPPED') NOT NULL,
        \`providerMessageId\` varchar(200) NULL,
        \`errorMessage\` varchar(500) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ix_notification_logs_appointment\` (\`appointmentId\`),
        UNIQUE INDEX \`ix_notification_logs_kind\` (\`appointmentId\`, \`kind\`, \`channel\`),
        CONSTRAINT \`fk_notification_logs_appointment\` FOREIGN KEY (\`appointmentId\`) REFERENCES \`appointments\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `notification_logs`');
  }
}
