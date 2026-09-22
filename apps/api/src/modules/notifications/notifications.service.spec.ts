import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import type { Appointment } from '../appointments/appointment.entity';
import type { AppointmentActionService } from '../appointments/appointment-action.service';
import type { Company } from '../companies/company.entity';
import type { Customer } from '../customers/customer.entity';
import type { Service } from '../services/service.entity';
import type { EmailProvider, SmsProvider } from './notification.types';
import type { NotificationLog } from './notification-log.entity';
import { NotificationsService } from './notifications.service';
import type { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';

jest.mock('./templates', () => ({
  renderTemplate: jest.fn().mockReturnValue({
    subject: 'Subject',
    text: 'Text body',
    html: '<p>Text body</p>',
  }),
}));

import { renderTemplate } from './templates';

const mockedRender = renderTemplate as jest.MockedFunction<typeof renderTemplate>;

describe('NotificationsService', () => {
  let queue: {
    add: jest.Mock;
    getJob: jest.Mock;
  };
  let appointments: jest.Mocked<Pick<Repository<Appointment>, 'findOne'>>;
  let companies: jest.Mocked<Pick<Repository<Company>, 'findOneOrFail'>>;
  let services: jest.Mocked<Pick<Repository<Service>, 'findOneOrFail'>>;
  let customers: jest.Mocked<Pick<Repository<Customer>, 'findOneOrFail'>>;
  let logs: { create: jest.Mock; save: jest.Mock };
  let emailProvider: jest.Mocked<EmailProvider>;
  let smsProvider: jest.Mocked<SmsProvider>;
  let whatsappProvider: jest.Mocked<Pick<TwilioWhatsAppProvider, 'send'>>;
  let actionService: jest.Mocked<Pick<AppointmentActionService, 'issueLinks'>>;
  let service: NotificationsService;

  const appointment = {
    id: 'appt-1',
    companyId: 'co-1',
    serviceId: 'svc-1',
    customerId: 'cust-1',
    startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000 + 30 * 60 * 1000),
    status: 'PENDING' as const,
  } as Appointment;

  const company = {
    id: 'co-1',
    name: 'Salon',
    timezone: 'America/Sao_Paulo',
    notificationPrefs: { email: true, secondaryChannel: 'NONE' as const },
  } as Company;

  const svcEntity = { id: 'svc-1', name: 'Cut' } as Service;
  const customer = {
    id: 'cust-1',
    name: 'Cust',
    email: 'c@example.com',
    phone: '+5511999999999',
  } as Customer;

  beforeEach(() => {
    jest.clearAllMocks();
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
    };
    appointments = { findOne: jest.fn() };
    companies = { findOneOrFail: jest.fn().mockResolvedValue(company) };
    services = { findOneOrFail: jest.fn().mockResolvedValue(svcEntity) };
    customers = { findOneOrFail: jest.fn().mockResolvedValue(customer) };
    logs = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    emailProvider = { send: jest.fn().mockResolvedValue(undefined) };
    smsProvider = { send: jest.fn().mockResolvedValue(undefined) };
    whatsappProvider = { send: jest.fn().mockResolvedValue(undefined) };
    actionService = {
      issueLinks: jest.fn().mockResolvedValue([
        { kind: 'CONFIRM', url: 'https://example.com/confirm', token: 't1', expiresAt: new Date() },
        { kind: 'CANCEL', url: 'https://example.com/cancel', token: 't2', expiresAt: new Date() },
      ]),
    };

    service = new NotificationsService(
      queue as unknown as Queue,
      appointments as unknown as Repository<Appointment>,
      companies as unknown as Repository<Company>,
      services as unknown as Repository<Service>,
      customers as unknown as Repository<Customer>,
      logs as unknown as Repository<NotificationLog>,
      emailProvider,
      smsProvider,
      whatsappProvider as unknown as TwilioWhatsAppProvider,
      actionService as unknown as AppointmentActionService,
    );
  });

  describe('enqueueImmediate', () => {
    it('adds job with deterministic id', async () => {
      await service.enqueueImmediate('appt-1', 'CREATED');
      expect(queue.add).toHaveBeenCalledWith(
        'notify.CREATED',
        { appointmentId: 'appt-1', kind: 'CREATED' },
        expect.objectContaining({ jobId: 'appt-1-CREATED' }),
      );
    });
  });

  describe('scheduleReminder', () => {
    it('adds delayed reminder job', async () => {
      const fireAt = new Date(Date.now() + 60_000);
      await service.scheduleReminder('appt-1', 'REMINDER_24H', fireAt);
      expect(queue.add).toHaveBeenCalledWith(
        'notify.REMINDER_24H',
        { appointmentId: 'appt-1', kind: 'REMINDER_24H' },
        expect.objectContaining({
          jobId: 'appt-1-REMINDER_24H',
          delay: expect.any(Number),
        }),
      );
    });
  });

  describe('cancelScheduled', () => {
    it('removes existing reminder jobs', async () => {
      const remove = jest.fn().mockResolvedValue(undefined);
      queue.getJob.mockResolvedValueOnce({ remove }).mockResolvedValueOnce(null);

      await service.cancelScheduled('appt-1');

      expect(queue.getJob).toHaveBeenCalledWith('appt-1-REMINDER_24H');
      expect(queue.getJob).toHaveBeenCalledWith('appt-1-REMINDER_1H');
      expect(remove).toHaveBeenCalled();
    });
  });

  describe('process', () => {
    it('returns early when appointment is missing', async () => {
      appointments.findOne.mockResolvedValue(null);
      await service.process({ appointmentId: 'missing', kind: 'CREATED' });
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    it('skips non-cancel jobs for cancelled appointments', async () => {
      appointments.findOne.mockResolvedValue({ ...appointment, status: 'CANCELLED' });
      await service.process({ appointmentId: 'appt-1', kind: 'CREATED' });
      expect(companies.findOneOrFail).not.toHaveBeenCalled();
    });

    it('skips reminders after appointment start', async () => {
      appointments.findOne.mockResolvedValue({
        ...appointment,
        startsAt: new Date(Date.now() - 60_000),
      });
      await service.process({ appointmentId: 'appt-1', kind: 'REMINDER_1H' });
      expect(companies.findOneOrFail).not.toHaveBeenCalled();
    });

    it('sends email when prefs and customer email are set', async () => {
      appointments.findOne.mockResolvedValue(appointment);
      await service.process({ appointmentId: 'appt-1', kind: 'CREATED' });

      expect(mockedRender).toHaveBeenCalled();
      expect(emailProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'c@example.com', subject: 'Subject' }),
      );
      expect(logs.save).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'EMAIL', status: 'SENT' }),
      );
    });

    it('skips email when channel disabled', async () => {
      appointments.findOne.mockResolvedValue(appointment);
      companies.findOneOrFail.mockResolvedValue({
        ...company,
        notificationPrefs: { email: false, secondaryChannel: 'NONE' },
      } as Company);

      await service.process({ appointmentId: 'appt-1', kind: 'CREATED' });
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    it('records FAILED when email provider throws', async () => {
      appointments.findOne.mockResolvedValue(appointment);
      emailProvider.send.mockRejectedValue(new Error('sendgrid down'));

      await service.process({ appointmentId: 'appt-1', kind: 'CREATED' });

      expect(logs.save).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'EMAIL',
          status: 'FAILED',
          errorMessage: 'sendgrid down',
        }),
      );
    });

    it('dispatches SMS secondary channel', async () => {
      appointments.findOne.mockResolvedValue(appointment);
      companies.findOneOrFail.mockResolvedValue({
        ...company,
        notificationPrefs: { email: false, secondaryChannel: 'SMS' },
      } as Company);

      await service.process({ appointmentId: 'appt-1', kind: 'CONFIRMED' });

      expect(smsProvider.send).toHaveBeenCalledWith({
        to: '+5511999999999',
        body: 'Text body',
      });
      expect(logs.save).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'SMS', status: 'SENT' }),
      );
    });

    it('dispatches WhatsApp secondary channel and records FAILURE', async () => {
      appointments.findOne.mockResolvedValue(appointment);
      companies.findOneOrFail.mockResolvedValue({
        ...company,
        notificationPrefs: { email: false, secondaryChannel: 'WHATSAPP' },
      } as Company);
      whatsappProvider.send.mockRejectedValue(new Error('twilio down'));

      await service.process({ appointmentId: 'appt-1', kind: 'CANCELLED' });

      expect(whatsappProvider.send).toHaveBeenCalled();
      expect(logs.save).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'WHATSAPP',
          status: 'FAILED',
          errorMessage: 'twilio down',
        }),
      );
    });

    it('skips secondary when customer has no phone', async () => {
      appointments.findOne.mockResolvedValue(appointment);
      companies.findOneOrFail.mockResolvedValue({
        ...company,
        notificationPrefs: { email: false, secondaryChannel: 'SMS' },
      } as Company);
      customers.findOneOrFail.mockResolvedValue({ ...customer, phone: null } as Customer);

      await service.process({ appointmentId: 'appt-1', kind: 'CREATED' });
      expect(smsProvider.send).not.toHaveBeenCalled();
    });

    it('processes CANCELLED kind even when appointment is cancelled', async () => {
      appointments.findOne.mockResolvedValue({ ...appointment, status: 'CANCELLED' });
      await service.process({ appointmentId: 'appt-1', kind: 'CANCELLED' });
      expect(emailProvider.send).toHaveBeenCalled();
    });

    it('ignores duplicate log unique constraint errors', async () => {
      appointments.findOne.mockResolvedValue(appointment);
      logs.save.mockRejectedValue(new Error('Duplicate entry'));

      await expect(
        service.process({ appointmentId: 'appt-1', kind: 'CREATED' }),
      ).resolves.toBeUndefined();
    });
  });
});
