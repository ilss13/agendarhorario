import type { ConfigService } from '@nestjs/config';
import { SendgridEmailProvider } from './sendgrid-email.provider';

const sendMock = jest.fn();
const setApiKeyMock = jest.fn();
const sendMailMock = jest.fn();
const createTransportMock = jest.fn((_opts?: unknown) => ({ sendMail: sendMailMock }));

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: (key: string) => setApiKeyMock(key),
    send: (msg: unknown) => sendMock(msg),
  },
}));

jest.mock('nodemailer', () => ({
  createTransport: (opts: unknown) => createTransportMock(opts),
}));

function configStub(values: Record<string, string | number | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = values[key];
      if (value === undefined) throw new Error(`missing ${key}`);
      return value;
    }),
  } as unknown as ConfigService;
}

describe('SendgridEmailProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends via SendGrid when API key is configured', async () => {
    const provider = new SendgridEmailProvider(
      configStub({
        SENDGRID_API_KEY: 'sg-key',
        EMAIL_FROM: 'from@example.com',
      }),
    );
    sendMock.mockResolvedValue([{}]);

    await provider.send({
      to: 'to@example.com',
      subject: 'Hello',
      text: 'plain',
      html: '<p>plain</p>',
    });

    expect(setApiKeyMock).toHaveBeenCalledWith('sg-key');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@example.com',
        from: 'from@example.com',
        subject: 'Hello',
      }),
    );
  });

  it('falls back to html from text when html is omitted', async () => {
    const provider = new SendgridEmailProvider(
      configStub({
        SENDGRID_API_KEY: 'sg-key',
        EMAIL_FROM: 'from@example.com',
      }),
    );
    sendMock.mockResolvedValue([{}]);

    await provider.send({ to: 'to@example.com', subject: 'Hi', text: 'plain only' });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ html: 'plain only' }));
  });

  it('propagates SendGrid API errors', async () => {
    const provider = new SendgridEmailProvider(
      configStub({
        SENDGRID_API_KEY: 'sg-key',
        EMAIL_FROM: 'from@example.com',
      }),
    );
    sendMock.mockRejectedValue(new Error('sg api error'));

    await expect(provider.send({ to: 'to@example.com', subject: 'Hi', text: 'x' })).rejects.toThrow(
      'sg api error',
    );
  });

  it('sends via SMTP when SendGrid key is absent', async () => {
    sendMailMock.mockResolvedValue({});
    const provider = new SendgridEmailProvider(
      configStub({
        SMTP_HOST: 'localhost',
        SMTP_PORT: 1025,
        EMAIL_FROM: 'from@example.com',
      }),
    );

    await provider.send({
      to: 'to@example.com',
      subject: 'SMTP',
      text: 'body',
      html: '<b>body</b>',
    });

    expect(createTransportMock).toHaveBeenCalledWith({ host: 'localhost', port: 1025 });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@example.com',
        from: 'from@example.com',
        subject: 'SMTP',
      }),
    );
  });

  it('logs fallback when no email transport is configured', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const provider = new SendgridEmailProvider(configStub({ EMAIL_FROM: 'from@example.com' }));
    const loggerWarn = jest
      .spyOn((provider as unknown as { logger: { warn: (m: string) => void } }).logger, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      provider.send({ to: 'to@example.com', subject: 'Fallback', text: 'body' }),
    ).resolves.toBeUndefined();

    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('[email-fallback]'));
    loggerWarn.mockRestore();
    warn.mockRestore();
  });

  it('throws when EMAIL_FROM is missing', async () => {
    const provider = new SendgridEmailProvider(
      configStub({
        SENDGRID_API_KEY: 'sg-key',
      }),
    );

    await expect(provider.send({ to: 'to@example.com', subject: 'Hi', text: 'x' })).rejects.toThrow(
      'missing EMAIL_FROM',
    );
  });
});
