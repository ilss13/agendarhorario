import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { Resend } from 'resend';
import type { EmailMessage, EmailProvider } from '../notification.types';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly client: Resend | null;
  private smtpTransporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    this.client = apiKey ? new Resend(apiKey) : null;
    if (this.client) return;

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpPort = this.config.get<number>('SMTP_PORT');
    if (smtpHost && smtpPort) {
      this.smtpTransporter = createTransport({ host: smtpHost, port: smtpPort });
    }
  }

  async send(message: EmailMessage): Promise<void> {
    const from = this.config.getOrThrow<string>('EMAIL_FROM');
    const html = message.html ?? message.text;
    if (this.client) {
      const { error } = await this.client.emails.send({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html,
      });
      if (error) {
        throw new Error(error.message);
      }
      return;
    }
    if (this.smtpTransporter) {
      await this.smtpTransporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html,
      });
      return;
    }
    this.logger.warn(
      `[email-fallback] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  }
}
