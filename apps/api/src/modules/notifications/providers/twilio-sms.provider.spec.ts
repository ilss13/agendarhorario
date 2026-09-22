import type { ConfigService } from '@nestjs/config';
import { TwilioSmsProvider } from './twilio-sms.provider';

const createMock = jest.fn();
const twilioFactory = jest.fn((_sid?: string, _token?: string) => ({
  messages: { create: createMock },
}));

jest.mock('twilio', () => ({
  __esModule: true,
  default: (sid: string, token: string) => twilioFactory(sid, token),
}));

function configStub(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('TwilioSmsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends SMS when Twilio is configured', async () => {
    createMock.mockResolvedValue({ sid: 'SM1' });
    const provider = new TwilioSmsProvider(
      configStub({
        TWILIO_ACCOUNT_SID: 'sid',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_SMS_FROM: '+15005550006',
      }),
    );

    await provider.send({ to: '+5511999999999', body: 'hello' });

    expect(twilioFactory).toHaveBeenCalledWith('sid', 'token');
    expect(createMock).toHaveBeenCalledWith({
      from: '+15005550006',
      to: '+5511999999999',
      body: 'hello',
    });
  });

  it('propagates Twilio API errors', async () => {
    createMock.mockRejectedValue(new Error('twilio sms error'));
    const provider = new TwilioSmsProvider(
      configStub({
        TWILIO_ACCOUNT_SID: 'sid',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_SMS_FROM: '+15005550006',
      }),
    );

    await expect(provider.send({ to: '+5511999999999', body: 'hello' })).rejects.toThrow(
      'twilio sms error',
    );
  });

  it('falls back to logger when config is incomplete', async () => {
    const provider = new TwilioSmsProvider(
      configStub({
        TWILIO_ACCOUNT_SID: 'sid',
      }),
    );
    const loggerWarn = jest
      .spyOn((provider as unknown as { logger: { warn: (m: string) => void } }).logger, 'warn')
      .mockImplementation(() => undefined);

    await expect(provider.send({ to: '+5511999999999', body: 'hello' })).resolves.toBeUndefined();
    expect(createMock).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('[sms-fallback]'));
    loggerWarn.mockRestore();
  });
});
