import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { createTransport, Transporter } from 'nodemailer';
import type { EmailMessage, EmailProvider } from '../notification.types';

@Injectable()
export class SendgridEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SendgridEmailProvider.name);
  private sendgridReady = false;
  private smtpTransporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.sendgridReady = true;
      return;
    }
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpPort = this.config.get<number>('SMTP_PORT');
    if (smtpHost && smtpPort) {
      this.smtpTransporter = createTransport({ host: smtpHost, port: smtpPort });
    }
  }

  async send(message: EmailMessage): Promise<void> {
    const from = this.config.getOrThrow<string>('EMAIL_FROM');
    if (this.sendgridReady) {
      await sgMail.send({
        to: message.to,
        from,
        subject: message.subject,
        text: message.text,
        html: message.html ?? message.text,
      });
      return;
    }
    if (this.smtpTransporter) {
      await this.smtpTransporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return;
    }
    this.logger.warn(
      `[email-fallback] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  }
}
