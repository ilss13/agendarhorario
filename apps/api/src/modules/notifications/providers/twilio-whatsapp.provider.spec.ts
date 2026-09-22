import type { ConfigService } from '@nestjs/config';
import { TwilioWhatsAppProvider } from './twilio-whatsapp.provider';

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

describe('TwilioWhatsAppProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefixes from/to with whatsapp: when missing', async () => {
    createMock.mockResolvedValue({ sid: 'WA1' });
    const provider = new TwilioWhatsAppProvider(
      configStub({
        TWILIO_ACCOUNT_SID: 'sid',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_WHATSAPP_FROM: '+15005550006',
      }),
    );

    await provider.send({ to: '+5511999999999', body: 'hi' });

    expect(createMock).toHaveBeenCalledWith({
      from: 'whatsapp:+15005550006',
      to: 'whatsapp:+5511999999999',
      body: 'hi',
    });
  });

  it('keeps existing whatsapp: prefixes', async () => {
    createMock.mockResolvedValue({ sid: 'WA2' });
    const provider = new TwilioWhatsAppProvider(
      configStub({
        TWILIO_ACCOUNT_SID: 'sid',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_WHATSAPP_FROM: 'whatsapp:+15005550006',
      }),
    );

    await provider.send({ to: 'whatsapp:+5511999999999', body: 'hi' });

    expect(createMock).toHaveBeenCalledWith({
      from: 'whatsapp:+15005550006',
      to: 'whatsapp:+5511999999999',
      body: 'hi',
    });
  });

  it('propagates Twilio API errors', async () => {
    createMock.mockRejectedValue(new Error('twilio wa error'));
    const provider = new TwilioWhatsAppProvider(
      configStub({
        TWILIO_ACCOUNT_SID: 'sid',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_WHATSAPP_FROM: '+15005550006',
      }),
    );

    await expect(provider.send({ to: '+5511999999999', body: 'hi' })).rejects.toThrow(
      'twilio wa error',
    );
  });

  it('falls back to logger when config is missing', async () => {
    const provider = new TwilioWhatsAppProvider(configStub({}));
    const loggerWarn = jest
      .spyOn((provider as unknown as { logger: { warn: (m: string) => void } }).logger, 'warn')
      .mockImplementation(() => undefined);

    await expect(provider.send({ to: '+5511999999999', body: 'hi' })).resolves.toBeUndefined();
    expect(createMock).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('[whatsapp-fallback]'));
    loggerWarn.mockRestore();
  });
});
