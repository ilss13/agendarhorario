import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt } from 'node:crypto';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';
import type {
  ConfirmVerificationRequest,
  RequestVerificationRequest,
} from '@agendarhorario/contracts';
import type { EmailProvider, SmsProvider } from '../notifications/notification.types';
import { Verification } from './verification.entity';
import { VerificationService } from './verification.service';

jest.mock('node:crypto', () => {
  const actual = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...actual,
    randomInt: jest.fn(() => 123456),
  };
});

const mockedRandomInt = randomInt as unknown as jest.Mock;

const hashCode = (code: string, target: string): string =>
  createHash('sha256').update(`${target}:${code}`).digest('hex');

describe('VerificationService', () => {
  const create = jest.fn();
  const save = jest.fn();
  const createQueryBuilder = jest.fn();
  const emailSend = jest.fn();
  const smsSend = jest.fn();
  const redisGet = jest.fn();
  const redisSet = jest.fn();
  const redisDel = jest.fn();
  const signAsync = jest.fn();
  const verifyAsync = jest.fn();
  const configGet = jest.fn();
  const configGetOrThrow = jest.fn();

  const repo = {
    create,
    save,
    createQueryBuilder,
  } as unknown as Repository<Verification>;
  const email = { send: emailSend } as unknown as EmailProvider;
  const sms = { send: smsSend } as unknown as SmsProvider;
  const redis = {
    get: redisGet,
    set: redisSet,
    del: redisDel,
  } as unknown as Redis;
  const jwt = { signAsync, verifyAsync } as unknown as JwtService;
  const config = {
    get: configGet,
    getOrThrow: configGetOrThrow,
  } as unknown as ConfigService;

  let service: VerificationService;
  const NOW = Date.parse('2026-05-11T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    mockedRandomInt.mockReturnValue(123456);
    create.mockImplementation((row: Partial<Verification>) => row);
    save.mockImplementation(async (row: Verification) => row);
    emailSend.mockResolvedValue(undefined);
    smsSend.mockResolvedValue(undefined);
    redisSet.mockResolvedValue('OK');
    redisDel.mockResolvedValue(1);
    signAsync.mockResolvedValue('jwt-token');
    configGetOrThrow.mockReturnValue('secret');
    configGet.mockImplementation((key: string) => {
      if (key === 'VERIFICATION_OTP_TTL_MINUTES') return 10;
      if (key === 'VERIFICATION_MAX_ATTEMPTS') return 5;
      if (key === 'VERIFICATION_TOKEN_TTL_MINUTES') return 15;
      if (key === 'nodeEnv' || key === 'NODE_ENV') return 'development';
      return undefined;
    });
    service = new VerificationService(repo, email, sms, redis, jwt, config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('request', () => {
    const input = {
      email: 'User@Ex.com',
      phone: '+5511999999999',
    } as RequestVerificationRequest;

    it('sends EMAIL OTP when Twilio is not configured', async () => {
      const result = await service.request(input);

      expect(result).toEqual({ channel: 'EMAIL', target: 'user@ex.com' });
      expect(emailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@ex.com',
          text: expect.stringContaining('123456'),
        }),
      );
      expect(smsSend).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EMAIL',
          target: 'user@ex.com',
          codeHash: hashCode('123456', 'user@ex.com'),
          attempts: 0,
        }),
      );
      expect(redisSet).toHaveBeenCalled();
    });

    it('sends SMS OTP when Twilio is configured', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'sid';
        if (key === 'TWILIO_AUTH_TOKEN') return 'token';
        if (key === 'TWILIO_SMS_FROM') return '+1555';
        if (key === 'VERIFICATION_OTP_TTL_MINUTES') return 10;
        if (key === 'nodeEnv') return 'development';
        return undefined;
      });

      const result = await service.request(input);
      expect(result).toEqual({ channel: 'SMS', target: '+5511999999999' });
      expect(smsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+5511999999999',
          body: expect.stringContaining('123456'),
        }),
      );
      expect(emailSend).not.toHaveBeenCalled();
    });

    it('skips Redis OTP storage in production', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'nodeEnv' || key === 'NODE_ENV') return 'production';
        if (key === 'VERIFICATION_OTP_TTL_MINUTES') return 10;
        return undefined;
      });

      await service.request(input);
      expect(redisSet).not.toHaveBeenCalled();
    });

    it('continues when Redis OTP storage fails', async () => {
      redisSet.mockRejectedValue(new Error('redis down'));
      await expect(service.request(input)).resolves.toEqual({
        channel: 'EMAIL',
        target: 'user@ex.com',
      });
    });
  });

  describe('confirm', () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    beforeEach(() => {
      createQueryBuilder.mockReturnValue(qb);
      qb.getOne.mockReset();
    });

    const pending = (overrides: Partial<Verification> = {}): Verification => {
      const v = new Verification();
      v.type = 'EMAIL';
      v.target = 'user@ex.com';
      v.codeHash = hashCode('123456', 'user@ex.com');
      v.expiresAt = new Date(NOW + 60_000);
      v.attempts = 0;
      v.consumedAt = null;
      Object.assign(v, overrides);
      return v;
    };

    it('returns a verification JWT for a valid code', async () => {
      qb.getOne.mockResolvedValue(pending());
      redisGet.mockResolvedValue(
        JSON.stringify({
          code: '123456',
          channel: 'EMAIL',
          email: 'user@ex.com',
          phone: '+5511',
        }),
      );

      const result = await service.confirm({
        channel: 'EMAIL',
        target: 'User@Ex.com',
        code: '123456',
      } as ConfirmVerificationRequest);

      expect(result.verificationToken).toBe('jwt-token');
      expect(result.target).toBe('user@ex.com');
      expect(result.channel).toBe('EMAIL');
      expect(signAsync).toHaveBeenCalled();
      expect(redisDel).toHaveBeenCalled();
    });

    it('throws BadRequestException when no pending code exists', async () => {
      qb.getOne.mockResolvedValue(null);
      await expect(
        service.confirm({
          channel: 'EMAIL',
          target: 'a@b.com',
          code: '000000',
        } as ConfirmVerificationRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when code is expired', async () => {
      qb.getOne.mockResolvedValue(pending({ expiresAt: new Date(NOW - 1) }));
      await expect(
        service.confirm({
          channel: 'EMAIL',
          target: 'user@ex.com',
          code: '123456',
        } as ConfirmVerificationRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when attempts are exhausted', async () => {
      qb.getOne.mockResolvedValue(pending({ attempts: 5 }));
      await expect(
        service.confirm({
          channel: 'EMAIL',
          target: 'user@ex.com',
          code: '123456',
        } as ConfirmVerificationRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('increments attempts and throws UnauthorizedException for wrong code', async () => {
      const row = pending();
      qb.getOne.mockResolvedValue(row);

      await expect(
        service.confirm({
          channel: 'EMAIL',
          target: 'user@ex.com',
          code: '000000',
        } as ConfirmVerificationRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(row.attempts).toBe(1);
      expect(save).toHaveBeenCalledWith(row);
    });

    it('confirms SMS without lowercasing the target', async () => {
      const row = pending({
        type: 'SMS',
        target: '+5511999999999',
        codeHash: hashCode('123456', '+5511999999999'),
      });
      qb.getOne.mockResolvedValue(row);
      redisGet.mockResolvedValue(null);

      const result = await service.confirm({
        channel: 'SMS',
        target: '+5511999999999',
        code: '123456',
      } as ConfirmVerificationRequest);

      expect(result.target).toBe('+5511999999999');
    });
  });

  describe('lookupDevOtp', () => {
    it('returns the Redis OTP record by email', async () => {
      const record = {
        code: '123456',
        channel: 'EMAIL' as const,
        email: 'user@ex.com',
        phone: '+5511',
      };
      redisGet.mockResolvedValue(JSON.stringify(record));

      await expect(service.lookupDevOtp({ email: ' User@Ex.com ' })).resolves.toEqual(record);
    });

    it('returns the Redis OTP record by phone', async () => {
      const record = {
        code: '654321',
        channel: 'SMS' as const,
        email: 'user@ex.com',
        phone: '+5511',
      };
      redisGet.mockResolvedValue(JSON.stringify(record));

      await expect(service.lookupDevOtp({ phone: ' +5511 ' })).resolves.toEqual(record);
    });

    it('throws NotFoundException in production', async () => {
      configGet.mockImplementation((key: string) =>
        key === 'nodeEnv' || key === 'NODE_ENV' ? 'production' : undefined,
      );
      await expect(service.lookupDevOtp({ email: 'a@b.com' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when email and phone are missing', async () => {
      await expect(service.lookupDevOtp({})).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when Redis has no record', async () => {
      redisGet.mockResolvedValue(null);
      await expect(service.lookupDevOtp({ email: 'a@b.com' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyToken', () => {
    it('returns the JWT payload', async () => {
      verifyAsync.mockResolvedValue({ channel: 'EMAIL', target: 'a@b.com' });
      await expect(service.verifyToken('tok')).resolves.toEqual({
        channel: 'EMAIL',
        target: 'a@b.com',
      });
    });

    it('throws UnauthorizedException for invalid tokens', async () => {
      verifyAsync.mockRejectedValue(new Error('expired'));
      await expect(service.verifyToken('bad')).rejects.toThrow(UnauthorizedException);
    });
  });
});
