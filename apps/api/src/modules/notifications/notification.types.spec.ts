import {
  EMAIL_PROVIDER,
  SMS_PROVIDER,
  type EmailMessage,
  type EmailProvider,
  type SmsMessage,
  type SmsProvider,
} from './notification.types';

describe('notification.types', () => {
  it('exposes provider injection tokens as symbols', () => {
    expect(typeof EMAIL_PROVIDER).toBe('symbol');
    expect(typeof SMS_PROVIDER).toBe('symbol');
    expect(EMAIL_PROVIDER).not.toBe(SMS_PROVIDER);
    expect(String(EMAIL_PROVIDER)).toContain('EMAIL_PROVIDER');
    expect(String(SMS_PROVIDER)).toContain('SMS_PROVIDER');
  });

  it('satisfies EmailMessage and EmailProvider contracts', async () => {
    const message: EmailMessage = {
      to: 'a@example.com',
      subject: 'Hi',
      text: 'plain',
      html: '<p>plain</p>',
    };
    const provider: EmailProvider = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    await provider.send(message);
    expect(provider.send).toHaveBeenCalledWith(message);
    expect(message.to).toBe('a@example.com');
  });

  it('satisfies SmsMessage and SmsProvider contracts', async () => {
    const message: SmsMessage = { to: '+5511999999999', body: 'hello' };
    const provider: SmsProvider = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    await provider.send(message);
    expect(provider.send).toHaveBeenCalledWith(message);
    expect(message.body).toBe('hello');
  });
});
