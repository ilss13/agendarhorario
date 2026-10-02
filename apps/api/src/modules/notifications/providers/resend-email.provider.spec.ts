import type { ConfigService } from '@nestjs/config';
import { ResendEmailProvider } from './resend-email.provider';

const sendMock = jest.fn();
const resendCtor = jest.fn().mockImplementation(() => ({
  emails: { send: sendMock },
}));
const sendMailMock = jest.fn();
const createTransportMock = jest.fn((_opts?: unknown) => ({ sendMail: sendMailMock }));

jest.mock('resend', () => ({
  Resend: function Resend(apiKey: string) {
    return resendCtor(apiKey);
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

describe('ResendEmailProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends via Resend when API key is configured', async () => {
    const provider = new ResendEmailProvider(
      configStub({
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'from@example.com',
      }),
    );
    sendMock.mockResolvedValue({ data: { id: 'email_1' }, error: null });

    await provider.send({
      to: 'to@example.com',
      subject: 'Hello',
      text: 'plain',
      html: '<p>plain</p>',
    });

    expect(resendCtor).toHaveBeenCalledWith('re_test');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['to@example.com'],
        from: 'from@example.com',
        subject: 'Hello',
        text: 'plain',
        html: '<p>plain</p>',
      }),
    );
  });

  it('falls back to html from text when html is omitted', async () => {
    const provider = new ResendEmailProvider(
      configStub({
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'from@example.com',
      }),
    );
    sendMock.mockResolvedValue({ data: { id: 'email_1' }, error: null });

    await provider.send({ to: 'to@example.com', subject: 'Hi', text: 'plain only' });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ html: 'plain only' }));
  });

  it('throws when Resend returns an error', async () => {
    const provider = new ResendEmailProvider(
      configStub({
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'from@example.com',
      }),
    );
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'domínio não verificado', name: 'validation_error' },
    });

    await expect(provider.send({ to: 'to@example.com', subject: 'Hi', text: 'x' })).rejects.toThrow(
      'domínio não verificado',
    );
  });

  it('propagates Resend client exceptions', async () => {
    const provider = new ResendEmailProvider(
      configStub({
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'from@example.com',
      }),
    );
    sendMock.mockRejectedValue(new Error('rede indisponível'));

    await expect(provider.send({ to: 'to@example.com', subject: 'Hi', text: 'x' })).rejects.toThrow(
      'rede indisponível',
    );
  });

  it('sends via SMTP when Resend key is absent', async () => {
    sendMailMock.mockResolvedValue({});
    const provider = new ResendEmailProvider(
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

    expect(resendCtor).not.toHaveBeenCalled();
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
    const provider = new ResendEmailProvider(configStub({ EMAIL_FROM: 'from@example.com' }));
    const loggerWarn = jest
      .spyOn((provider as unknown as { logger: { warn: (m: string) => void } }).logger, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      provider.send({ to: 'to@example.com', subject: 'Fallback', text: 'body' }),
    ).resolves.toBeUndefined();

    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('[email-fallback]'));
    loggerWarn.mockRestore();
  });

  it('throws when EMAIL_FROM is missing', async () => {
    const provider = new ResendEmailProvider(
      configStub({
        RESEND_API_KEY: 're_test',
      }),
    );

    await expect(provider.send({ to: 'to@example.com', subject: 'Hi', text: 'x' })).rejects.toThrow(
      'missing EMAIL_FROM',
    );
  });
});
