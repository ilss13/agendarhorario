jest.mock('stripe', () => {
  const constructEvent = jest.fn();
  const StripeMock = jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent },
  }));
  return { __esModule: true, default: StripeMock };
});

import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeClient } from './stripe.client';

type StripeCtor = jest.MockedClass<typeof Stripe>;

describe('StripeClient', () => {
  const StripeMock = Stripe as unknown as StripeCtor;

  beforeEach(() => {
    StripeMock.mockClear();
    const instance = StripeMock.mock.results[0]?.value as
      | { webhooks: { constructEvent: jest.Mock } }
      | undefined;
    instance?.webhooks.constructEvent.mockReset();
  });

  function configWith(values: Record<string, string | undefined>): ConfigService {
    return {
      get: jest.fn((key: string) => values[key]),
      getOrThrow: jest.fn((key: string) => {
        const v = values[key];
        if (v === undefined) throw new Error(`missing ${key}`);
        return v;
      }),
    } as unknown as ConfigService;
  }

  it('constructs Stripe SDK when secret key is present', () => {
    const client = new StripeClient(configWith({ STRIPE_SECRET_KEY: 'sk_test_x' }));
    expect(StripeMock).toHaveBeenCalledWith('sk_test_x', {
      apiVersion: '2024-12-18.acacia',
    });
    expect(client.stripe).toBeDefined();
  });

  it('throws when stripe getter is used without secret key', () => {
    const client = new StripeClient(configWith({ STRIPE_SECRET_KEY: undefined }));
    expect(() => client.stripe).toThrow('Stripe não configurado (STRIPE_SECRET_KEY ausente)');
  });

  it('constructEvent verifies signature with webhook secret', () => {
    const client = new StripeClient(
      configWith({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x' }),
    );
    const event = { id: 'evt_1', type: 'invoice.paid' } as Stripe.Event;
    const constructEvent = (client.stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(
      event,
    );
    const raw = Buffer.from('{}');
    expect(client.constructEvent(raw, 'sig')).toBe(event);
    expect(constructEvent).toHaveBeenCalledWith(raw, 'sig', 'whsec_x');
  });

  it('throws when webhook secret is missing during constructEvent', () => {
    const client = new StripeClient(configWith({ STRIPE_SECRET_KEY: 'sk_test_x' }));
    expect(() => client.constructEvent(Buffer.from('{}'), 'sig')).toThrow(
      'missing STRIPE_WEBHOOK_SECRET',
    );
  });
});
