import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentActionToken } from '../appointments/appointment-action-token.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentActionService } from '../appointments/appointment-action.service';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Service } from '../services/service.entity';
import { NotificationLog } from './notification-log.entity';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './notification.types';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { SendgridEmailProvider } from './providers/sendgrid-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentActionToken,
      Company,
      Customer,
      Service,
      NotificationLog,
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
        },
      }),
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('VERIFICATION_JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    SendgridEmailProvider,
    TwilioSmsProvider,
    TwilioWhatsAppProvider,
    { provide: EMAIL_PROVIDER, useExisting: SendgridEmailProvider },
    { provide: SMS_PROVIDER, useExisting: TwilioSmsProvider },
    AppointmentActionService,
    NotificationsService,
    NotificationsProcessor,
  ],
  exports: [EMAIL_PROVIDER, SMS_PROVIDER, AppointmentActionService, NotificationsService],
})
export class NotificationsModule {}
