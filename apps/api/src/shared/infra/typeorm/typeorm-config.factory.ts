import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BusinessException } from '../../../modules/business-hours/business-exception.entity';
import { BusinessHour } from '../../../modules/business-hours/business-hour.entity';
import { Company } from '../../../modules/companies/company.entity';
import { Service } from '../../../modules/services/service.entity';
import { User } from '../../../modules/users/user.entity';

export const typeOrmConfigFactory = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('DB_HOST'),
  port: config.get<number>('DB_PORT'),
  username: config.get<string>('DB_USER'),
  password: config.get<string>('DB_PASSWORD'),
  database: config.get<string>('DB_NAME'),
  entities: [User, Company, Service, BusinessHour, BusinessException],
  migrationsRun: false,
  synchronize: config.get<boolean>('DB_SYNCHRONIZE') === true,
  logging: config.get<boolean>('DB_LOGGING') === true,
  timezone: 'Z',
  charset: 'utf8mb4_unicode_ci',
  autoLoadEntities: true,
});
