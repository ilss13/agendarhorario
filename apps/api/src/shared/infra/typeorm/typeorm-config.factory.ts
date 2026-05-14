import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppointmentActionToken } from '../../../modules/appointments/appointment-action-token.entity';
import { Appointment } from '../../../modules/appointments/appointment.entity';
import { BusinessException } from '../../../modules/business-hours/business-exception.entity';
import { BusinessHour } from '../../../modules/business-hours/business-hour.entity';
import { Company } from '../../../modules/companies/company.entity';
import { Customer } from '../../../modules/customers/customer.entity';
import { NotificationLog } from '../../../modules/notifications/notification-log.entity';
import { Service } from '../../../modules/services/service.entity';
import { User } from '../../../modules/users/user.entity';
import { Verification } from '../../../modules/verification/verification.entity';

export const typeOrmConfigFactory = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.get<string>('DB_HOST'),
  port: config.get<number>('DB_PORT'),
  username: config.get<string>('DB_USER'),
  password: config.get<string>('DB_PASSWORD'),
  database: config.get<string>('DB_NAME'),
  entities: [
    User,
    Company,
    Service,
    BusinessHour,
    BusinessException,
    Customer,
    Appointment,
    Verification,
    AppointmentActionToken,
    NotificationLog,
  ],
  migrationsRun: false,
  synchronize: config.get<boolean>('DB_SYNCHRONIZE') === true,
  logging: config.get<boolean>('DB_LOGGING') === true,
  timezone: 'Z',
  charset: 'utf8mb4_unicode_ci',
  autoLoadEntities: true,
});
