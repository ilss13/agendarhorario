import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ConfirmVerificationRequest,
  RequestVerificationRequest,
} from '@agendarhorario/contracts';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

describe('VerificationController', () => {
  const request = jest.fn();
  const confirm = jest.fn();
  const lookupDevOtp = jest.fn();
  const service = { request, confirm, lookupDevOtp } as unknown as VerificationService;
  const configGet = jest.fn();
  const config = { get: configGet } as unknown as ConfigService;
  const controller = new VerificationController(service, config);

  beforeEach(() => {
    request.mockReset();
    confirm.mockReset();
    lookupDevOtp.mockReset();
    configGet.mockReset();
  });

  it('delegates request to the service', async () => {
    const input = {
      email: 'a@b.com',
      phone: '+5511999999999',
    } as RequestVerificationRequest;
    const expected = { channel: 'EMAIL', target: 'a@b.com' } as const;
    request.mockResolvedValue(expected);

    await expect(controller.request(input)).resolves.toEqual(expected);
    expect(request).toHaveBeenCalledWith(input);
  });

  it('propagates request errors from the service', async () => {
    request.mockRejectedValue(new Error('send failed'));
    await expect(
      controller.request({ email: 'a@b.com', phone: '+5511' } as RequestVerificationRequest),
    ).rejects.toThrow('send failed');
  });

  it('delegates confirm to the service', async () => {
    const input = {
      channel: 'EMAIL',
      target: 'a@b.com',
      code: '123456',
    } as ConfirmVerificationRequest;
    const expected = {
      verificationToken: 'tok',
      channel: 'EMAIL',
      target: 'a@b.com',
      expiresAt: '2026-05-11T12:00:00.000Z',
    } as const;
    confirm.mockResolvedValue(expected);

    await expect(controller.confirm(input)).resolves.toEqual(expected);
    expect(confirm).toHaveBeenCalledWith(input);
  });

  it('propagates confirm errors from the service', async () => {
    confirm.mockRejectedValue(new NotFoundException());
    await expect(
      controller.confirm({
        channel: 'EMAIL',
        target: 'a@b.com',
        code: '000000',
      } as ConfirmVerificationRequest),
    ).rejects.toThrow(NotFoundException);
  });

  it('looks up OTP in non-production environments', async () => {
    configGet.mockReturnValue('development');
    const expected = {
      code: '123456',
      channel: 'EMAIL',
      email: 'a@b.com',
      phone: '+5511',
    };
    lookupDevOtp.mockResolvedValue(expected);

    await expect(controller.lookupDevOtp('a@b.com', '+5511')).resolves.toEqual(expected);
    expect(lookupDevOtp).toHaveBeenCalledWith({ email: 'a@b.com', phone: '+5511' });
  });

  it('throws NotFoundException for OTP lookup in production', async () => {
    configGet.mockImplementation((key: string) =>
      key === 'nodeEnv' || key === 'NODE_ENV' ? 'production' : undefined,
    );

    await expect(controller.lookupDevOtp('a@b.com')).rejects.toThrow(NotFoundException);
    expect(lookupDevOtp).not.toHaveBeenCalled();
  });
});
