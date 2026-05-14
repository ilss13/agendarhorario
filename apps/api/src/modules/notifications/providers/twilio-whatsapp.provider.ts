import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';
import type { SmsMessage, SmsProvider } from '../notification.types';

@Injectable()
export class TwilioWhatsAppProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioWhatsAppProvider.name);
  private client: Twilio | null = null;
  private from: string | null = null;

  constructor(private readonly config: ConfigService) {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.config.get<string>('TWILIO_WHATSAPP_FROM');
    if (sid && token && from) {
      this.client = twilio(sid, token);
      this.from = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    }
  }

  async send(message: SmsMessage): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.warn(`[whatsapp-fallback] to=${message.to} body="${message.body}"`);
      return;
    }
    const to = message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`;
    await this.client.messages.create({
      from: this.from,
      to,
      body: message.body,
    });
  }
}
