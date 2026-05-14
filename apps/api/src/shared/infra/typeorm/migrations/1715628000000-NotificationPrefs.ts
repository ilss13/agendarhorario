import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationPrefs1715628000000 implements MigrationInterface {
  name = 'NotificationPrefs1715628000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`companies\`
      ADD COLUMN \`notificationPrefs\` json NOT NULL
      DEFAULT (JSON_OBJECT('email', true, 'secondaryChannel', 'NONE'))
    `);

    await queryRunner.query(`
      UPDATE \`companies\`
      SET \`notificationPrefs\` = JSON_OBJECT(
        'email', COALESCE(JSON_EXTRACT(\`notificationToggles\`, '$.email'), true),
        'secondaryChannel', CASE
          WHEN JSON_EXTRACT(\`notificationToggles\`, '$.whatsapp') = true THEN 'WHATSAPP'
          WHEN JSON_EXTRACT(\`notificationToggles\`, '$.sms') = true THEN 'SMS'
          ELSE 'NONE'
        END
      )
    `);

    await queryRunner.query('ALTER TABLE `companies` DROP COLUMN `notificationToggles`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`companies\`
      ADD COLUMN \`notificationToggles\` json NOT NULL
      DEFAULT (JSON_OBJECT('email', true, 'sms', false, 'whatsapp', false))
    `);
    await queryRunner.query(`
      UPDATE \`companies\`
      SET \`notificationToggles\` = JSON_OBJECT(
        'email', COALESCE(JSON_EXTRACT(\`notificationPrefs\`, '$.email'), true),
        'sms', JSON_EXTRACT(\`notificationPrefs\`, '$.secondaryChannel') = 'SMS',
        'whatsapp', JSON_EXTRACT(\`notificationPrefs\`, '$.secondaryChannel') = 'WHATSAPP'
      )
    `);
    await queryRunner.query('ALTER TABLE `companies` DROP COLUMN `notificationPrefs`');
  }
}
