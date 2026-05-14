import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { IsNull, Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Service } from '../services/service.entity';
import { AppointmentActionService } from '../appointments/appointment-action.service';
import { EMAIL_PROVIDER, EmailProvider, SMS_PROVIDER, SmsProvider } from './notification.types';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobData,
  NotificationJobKind,
  jobNameFor,
} from './notifications.constants';
import { NotificationLog } from './notification-log.entity';
import { renderTemplate } from './templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJobData>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(NotificationLog) private readonly logs: Repository<NotificationLog>,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
    private readonly whatsappProvider: TwilioWhatsAppProvider,
    private readonly actionService: AppointmentActionService,
  ) {}

  async enqueueImmediate(appointmentId: string, kind: NotificationJobKind): Promise<void> {
    await this.queue.add(
      jobNameFor(kind),
      { appointmentId, kind },
      { jobId: `${appointmentId}:${kind}`, removeOnComplete: true, removeOnFail: 200 },
    );
  }

  async scheduleReminder(
    appointmentId: string,
    kind: 'REMINDER_24H' | 'REMINDER_1H',
    fireAt: Date,
  ): Promise<void> {
    const delay = Math.max(0, fireAt.getTime() - Date.now());
    await this.queue.add(
      jobNameFor(kind),
      { appointmentId, kind },
      {
        jobId: `${appointmentId}:${kind}`,
        delay,
        removeOnComplete: true,
        removeOnFail: 200,
      },
    );
  }

  async cancelScheduled(appointmentId: string): Promise<void> {
    for (const kind of ['REMINDER_24H', 'REMINDER_1H'] as const) {
      const job = await this.queue.getJob(`${appointmentId}:${kind}`);
      if (job) await job.remove();
    }
  }

  /** Executa o envio efetivo (chamado pelo worker). */
  async process(job: NotificationJobData): Promise<void> {
    const appointment = await this.appointments.findOne({
      where: { id: job.appointmentId, deletedAt: IsNull() },
    });
    if (!appointment) return;
    if (appointment.status === 'CANCELLED' && job.kind !== 'CANCELLED') return;
    if (
      (job.kind === 'REMINDER_24H' || job.kind === 'REMINDER_1H') &&
      appointment.startsAt.getTime() < Date.now()
    ) {
      return;
    }

    const [company, service, customer] = await Promise.all([
      this.companies.findOneOrFail({ where: { id: appointment.companyId } }),
      this.services.findOneOrFail({ where: { id: appointment.serviceId } }),
      this.customers.findOneOrFail({ where: { id: appointment.customerId } }),
    ]);

    const links = await this.actionService.issueLinks(appointment.id, ['CONFIRM', 'CANCEL']);
    const confirmUrl = links.find((l) => l.kind === 'CONFIRM')?.url ?? null;
    const cancelUrl = links.find((l) => l.kind === 'CANCEL')?.url ?? null;

    const rendered = renderTemplate(job.kind, {
      appointment,
      company,
      service,
      customer,
      confirmUrl,
      cancelUrl,
    });

    if (company.notificationPrefs.email && customer.email) {
      await this.dispatchEmail(appointment.id, job.kind, customer.email, rendered);
    }

    const secondary = company.notificationPrefs.secondaryChannel;
    if (secondary !== 'NONE' && customer.phone) {
      await this.dispatchSecondary(
        appointment.id,
        job.kind,
        secondary,
        customer.phone,
        rendered.text,
      );
    }
  }

  private async dispatchEmail(
    appointmentId: string,
    kind: NotificationJobKind,
    to: string,
    rendered: { subject: string; text: string; html: string },
  ): Promise<void> {
    try {
      await this.emailProvider.send({
        to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      await this.recordLog(appointmentId, kind, 'EMAIL', 'SENT');
    } catch (err) {
      this.logger.error(`falha ao enviar email: ${(err as Error).message}`);
      await this.recordLog(appointmentId, kind, 'EMAIL', 'FAILED', (err as Error).message);
    }
  }

  private async dispatchSecondary(
    appointmentId: string,
    kind: NotificationJobKind,
    channel: 'SMS' | 'WHATSAPP',
    to: string,
    body: string,
  ): Promise<void> {
    const provider = channel === 'SMS' ? this.smsProvider : this.whatsappProvider;
    try {
      await provider.send({ to, body });
      await this.recordLog(appointmentId, kind, channel, 'SENT');
    } catch (err) {
      this.logger.error(`falha ao enviar ${channel}: ${(err as Error).message}`);
      await this.recordLog(appointmentId, kind, channel, 'FAILED', (err as Error).message);
    }
  }

  private async recordLog(
    appointmentId: string,
    kind: NotificationJobKind,
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP',
    status: 'SENT' | 'FAILED' | 'SKIPPED',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.logs.save(
        this.logs.create({
          appointmentId,
          kind,
          channel,
          status,
          errorMessage: errorMessage ?? null,
          providerMessageId: null,
        }),
      );
    } catch (err) {
      // ignora UQ constraint quando o mesmo job é reentregue
      this.logger.debug(`recordLog: ${(err as Error).message}`);
    }
  }
}
