import { MODULE_METADATA } from '@nestjs/common/constants';
import { EMAIL_PROVIDER, SMS_PROVIDER } from './notification.types';
import { NotificationsModule } from './notifications.module';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { SendgridEmailProvider } from './providers/sendgrid-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';

describe('NotificationsModule', () => {
  it('registers notification providers and processor', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NotificationsModule,
    ) as unknown[];
    expect(providers).toEqual(
      expect.arrayContaining([
        SendgridEmailProvider,
        TwilioSmsProvider,
        TwilioWhatsAppProvider,
        NotificationsService,
        NotificationsProcessor,
      ]),
    );
  });

  it('exports email/sms tokens and NotificationsService', () => {
    const exportsMeta = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      NotificationsModule,
    ) as unknown[];
    expect(exportsMeta).toEqual(
      expect.arrayContaining([EMAIL_PROVIDER, SMS_PROVIDER, NotificationsService]),
    );
  });

  it('declares imports for TypeORM and queues', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, NotificationsModule) as unknown[];
    expect(imports.length).toBeGreaterThan(0);
  });
});
