import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadDotenv } from 'dotenv';
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

loadDotenv();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: Number(process.env['DB_PORT'] ?? 3306),
  username: process.env['DB_USER'] ?? 'app',
  password: process.env['DB_PASSWORD'] ?? 'app',
  database: process.env['DB_NAME'] ?? 'agendarhorario',
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
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  timezone: 'Z',
  charset: 'utf8mb4_unicode_ci',
  synchronize: false,
  logging: process.env['DB_LOGGING'] === 'true',
});

export default AppDataSource;
