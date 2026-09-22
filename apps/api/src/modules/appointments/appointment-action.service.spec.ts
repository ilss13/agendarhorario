import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppointmentActionToken } from './appointment-action-token.entity';
import { AppointmentActionService } from './appointment-action.service';
import { Appointment } from './appointment.entity';

const hash = (token: string): string => createHash('sha256').update(token).digest('hex');

describe('AppointmentActionService', () => {
  const tokens = {
    save: jest.fn(),
    create: jest.fn((v: Partial<AppointmentActionToken>) => v as AppointmentActionToken),
    findOne: jest.fn(),
  };
  const appointments = {
    findOne: jest.fn(),
  };
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const config = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  let service: AppointmentActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'APPOINTMENT_ACTION_TOKEN_TTL_HOURS') return 72;
      if (key === 'WEB_ORIGIN') return 'https://app.example';
      return undefined;
    });
    config.getOrThrow.mockReturnValue('secret');
    service = new AppointmentActionService(
      tokens as unknown as Repository<AppointmentActionToken>,
      appointments as unknown as Repository<Appointment>,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      dataSource as unknown as DataSource,
    );
  });

  describe('issueLinks', () => {
    it('creates JWT links for requested kinds', async () => {
      jwt.signAsync.mockResolvedValueOnce('jwt-confirm').mockResolvedValueOnce('jwt-cancel');
      tokens.save.mockResolvedValue({});

      const links = await service.issueLinks('appt-1');

      expect(links).toHaveLength(2);
      expect(links[0]).toMatchObject({
        kind: 'CONFIRM',
        token: 'jwt-confirm',
        url: 'https://app.example/a/jwt-confirm',
      });
      expect(links[1]).toMatchObject({
        kind: 'CANCEL',
        token: 'jwt-cancel',
        url: 'https://app.example/a/jwt-cancel',
      });
      expect(tokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: 'appt-1',
          kind: 'CONFIRM',
          tokenHash: hash('jwt-confirm'),
        }),
      );
    });

    it('uses defaults when TTL and origin are missing', async () => {
      config.get.mockReturnValue(undefined);
      jwt.signAsync.mockResolvedValue('jwt-only');
      tokens.save.mockResolvedValue({});

      const links = await service.issueLinks('appt-1', ['CONFIRM']);

      expect(links[0]!.url).toBe('http://localhost:4200/a/jwt-only');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ appointmentId: 'appt-1', kind: 'CONFIRM' }),
        expect.objectContaining({ expiresIn: '72h' }),
      );
    });
  });

  describe('preview', () => {
    it('returns appointment with consumed flag', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      tokens.findOne.mockResolvedValue({
        tokenHash: hash('tok'),
        kind: 'CONFIRM',
        consumedAt: null,
      });
      const appointment = { id: 'appt-1' } as Appointment;
      appointments.findOne.mockResolvedValue(appointment);

      await expect(service.preview('tok')).resolves.toEqual({
        appointment,
        kind: 'CONFIRM',
        consumed: false,
      });
    });

    it('throws BadRequestException when JWT is invalid', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad'));
      await expect(service.preview('bad')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when token record is missing', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      tokens.findOne.mockResolvedValue(null);

      await expect(service.preview('tok')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when appointment is missing', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CANCEL',
        nonce: 'n1',
      });
      tokens.findOne.mockResolvedValue({
        tokenHash: hash('tok'),
        kind: 'CANCEL',
        consumedAt: new Date(),
      });
      appointments.findOne.mockResolvedValue(null);

      await expect(service.preview('tok')).rejects.toThrow(NotFoundException);
    });
  });

  describe('consume', () => {
    const setupTransaction = (opts: {
      record: AppointmentActionToken | null;
      appointment: Appointment | null;
    }) => {
      const tokenRepo = {
        findOne: jest.fn().mockResolvedValue(opts.record),
        save: jest.fn(async (v: AppointmentActionToken) => v),
      };
      const apptRepo = {
        findOne: jest.fn().mockResolvedValue(opts.appointment),
        save: jest.fn(async (v: Appointment) => v),
      };
      dataSource.transaction.mockImplementation(
        async (cb: (m: EntityManager) => Promise<Appointment>) => {
          const manager = {
            getRepository: jest.fn((entity: unknown) => {
              if (entity === AppointmentActionToken) return tokenRepo;
              if (entity === Appointment) return apptRepo;
              throw new Error('unexpected entity');
            }),
          } as unknown as EntityManager;
          return cb(manager);
        },
      );
      return { tokenRepo, apptRepo };
    };

    it('confirms a pending appointment', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      const record = {
        tokenHash: hash('tok'),
        kind: 'CONFIRM',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      } as AppointmentActionToken;
      const appointment = {
        id: 'appt-1',
        status: 'PENDING',
        cancelReason: null,
      } as Appointment;
      const { tokenRepo, apptRepo } = setupTransaction({ record, appointment });

      const result = await service.consume('tok');

      expect(result.status).toBe('CONFIRMED');
      expect(apptRepo.save).toHaveBeenCalled();
      expect(tokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ consumedAt: expect.any(Date) }),
      );
    });

    it('cancels an appointment and sets cancel reason', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CANCEL',
        nonce: 'n1',
      });
      const record = {
        tokenHash: hash('tok'),
        kind: 'CANCEL',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      } as AppointmentActionToken;
      const appointment = {
        id: 'appt-1',
        status: 'PENDING',
        cancelReason: null,
      } as Appointment;
      setupTransaction({ record, appointment });

      const result = await service.consume('tok');
      expect(result.status).toBe('CANCELLED');
      expect(result.cancelReason).toBe('Cancelado pelo cliente via link');
    });

    it('is idempotent when cancelling an already cancelled appointment', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CANCEL',
        nonce: 'n1',
      });
      const record = {
        tokenHash: hash('tok'),
        kind: 'CANCEL',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      } as AppointmentActionToken;
      const appointment = {
        id: 'appt-1',
        status: 'CANCELLED',
        cancelReason: 'já',
      } as Appointment;
      setupTransaction({ record, appointment });

      const result = await service.consume('tok');
      expect(result.status).toBe('CANCELLED');
      expect(result.cancelReason).toBe('já');
    });

    it('throws NotFoundException when token record is missing in transaction', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      setupTransaction({ record: null, appointment: null });
      await expect(service.consume('tok')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when link was already consumed', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      setupTransaction({
        record: {
          tokenHash: hash('tok'),
          kind: 'CONFIRM',
          consumedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        } as AppointmentActionToken,
        appointment: null,
      });
      await expect(service.consume('tok')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when link is expired', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      setupTransaction({
        record: {
          tokenHash: hash('tok'),
          kind: 'CONFIRM',
          consumedAt: null,
          expiresAt: new Date(Date.now() - 1000),
        } as AppointmentActionToken,
        appointment: null,
      });
      await expect(service.consume('tok')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when appointment is missing in transaction', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      setupTransaction({
        record: {
          tokenHash: hash('tok'),
          kind: 'CONFIRM',
          consumedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        } as AppointmentActionToken,
        appointment: null,
      });
      await expect(service.consume('tok')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when confirming a cancelled appointment', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'CONFIRM',
        nonce: 'n1',
      });
      setupTransaction({
        record: {
          tokenHash: hash('tok'),
          kind: 'CONFIRM',
          consumedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        } as AppointmentActionToken,
        appointment: { id: 'appt-1', status: 'CANCELLED' } as Appointment,
      });
      await expect(service.consume('tok')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for unsupported action kind', async () => {
      jwt.verifyAsync.mockResolvedValue({
        appointmentId: 'appt-1',
        kind: 'RESCHEDULE',
        nonce: 'n1',
      });
      setupTransaction({
        record: {
          tokenHash: hash('tok'),
          kind: 'RESCHEDULE',
          consumedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        } as AppointmentActionToken,
        appointment: { id: 'appt-1', status: 'PENDING' } as Appointment,
      });
      await expect(service.consume('tok')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when JWT decode fails', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('expired'));
      await expect(service.consume('bad')).rejects.toThrow(BadRequestException);
    });
  });
});
