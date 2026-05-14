import { Global, Module } from '@nestjs/common';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './notification.types';
import { SendgridEmailProvider } from './providers/sendgrid-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';

@Global()
@Module({
  providers: [
    SendgridEmailProvider,
    TwilioSmsProvider,
    { provide: EMAIL_PROVIDER, useExisting: SendgridEmailProvider },
    { provide: SMS_PROVIDER, useExisting: TwilioSmsProvider },
  ],
  exports: [EMAIL_PROVIDER, SMS_PROVIDER],
})
export class NotificationsModule {}
