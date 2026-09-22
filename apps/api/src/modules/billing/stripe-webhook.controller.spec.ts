import { BadRequestException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type Stripe from 'stripe';
import type { BillingService } from './billing.service';
import type { StripeClient } from './stripe.client';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController', () => {
  const constructEvent = jest.fn<Stripe.Event, [Buffer, string]>();
  const tryRegisterEvent = jest.fn<Promise<boolean>, [Stripe.Event]>();
  const markEventProcessed = jest.fn<Promise<void>, [string, string?]>();
  const upsertFromCheckoutSession = jest.fn<Promise<void>, [Stripe.Checkout.Session]>();
  const upsertSubscriptionFromStripe = jest.fn<Promise<void>, [Stripe.Subscription]>();
  const upsertInvoiceFromStripe = jest.fn<Promise<void>, [Stripe.Invoice]>();

  const stripe = { constructEvent } as unknown as StripeClient;
  const billing = {
    tryRegisterEvent,
    markEventProcessed,
    upsertFromCheckoutSession,
    upsertSubscriptionFromStripe,
    upsertInvoiceFromStripe,
  } as unknown as BillingService;

  const controller = new StripeWebhookController(stripe, billing);

  function reqWith(raw?: Buffer): RawBodyRequest<Request> {
    return { rawBody: raw } as RawBodyRequest<Request>;
  }

  function event(type: string, object: object): Stripe.Event {
    return {
      id: `evt_${type}`,
      type,
      data: { object },
    } as Stripe.Event;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws BadRequestException when stripe-signature is missing', async () => {
    await expect(controller.handle(reqWith(Buffer.from('{}')), undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when raw body is missing', async () => {
    await expect(controller.handle(reqWith(undefined), 'sig')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when signature verification fails', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    await expect(controller.handle(reqWith(Buffer.from('{}')), 'sig')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('skips processing when event was already handled', async () => {
    const ev = event('invoice.paid', { id: 'in_1' });
    constructEvent.mockReturnValue(ev);
    tryRegisterEvent.mockResolvedValue(false);
    await expect(controller.handle(reqWith(Buffer.from('{}')), 'sig')).resolves.toEqual({
      received: true,
    });
    expect(upsertInvoiceFromStripe).not.toHaveBeenCalled();
  });

  it('processes checkout.session.completed', async () => {
    const session = { id: 'cs_1' } as Stripe.Checkout.Session;
    const ev = event('checkout.session.completed', session);
    constructEvent.mockReturnValue(ev);
    tryRegisterEvent.mockResolvedValue(true);
    markEventProcessed.mockResolvedValue(undefined);
    await expect(controller.handle(reqWith(Buffer.from('{}')), 'sig')).resolves.toEqual({
      received: true,
    });
    expect(upsertFromCheckoutSession).toHaveBeenCalledWith(session);
    expect(markEventProcessed).toHaveBeenCalledWith(ev.id);
  });

  it.each([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ] as const)('processes %s', async (type) => {
    const sub = { id: 'sub_1' } as Stripe.Subscription;
    const ev = event(type, sub);
    constructEvent.mockReturnValue(ev);
    tryRegisterEvent.mockResolvedValue(true);
    markEventProcessed.mockResolvedValue(undefined);
    await controller.handle(reqWith(Buffer.from('{}')), 'sig');
    expect(upsertSubscriptionFromStripe).toHaveBeenCalledWith(sub);
  });

  it.each([
    'invoice.created',
    'invoice.finalized',
    'invoice.paid',
    'invoice.payment_failed',
    'invoice.voided',
    'invoice.marked_uncollectible',
  ] as const)('processes %s', async (type) => {
    const invoice = { id: 'in_1' } as Stripe.Invoice;
    const ev = event(type, invoice);
    constructEvent.mockReturnValue(ev);
    tryRegisterEvent.mockResolvedValue(true);
    markEventProcessed.mockResolvedValue(undefined);
    await controller.handle(reqWith(Buffer.from('{}')), 'sig');
    expect(upsertInvoiceFromStripe).toHaveBeenCalledWith(invoice);
  });

  it('ignores unknown event types but still marks processed', async () => {
    const ev = event('ping', {});
    constructEvent.mockReturnValue(ev);
    tryRegisterEvent.mockResolvedValue(true);
    markEventProcessed.mockResolvedValue(undefined);
    await expect(controller.handle(reqWith(Buffer.from('{}')), 'sig')).resolves.toEqual({
      received: true,
    });
    expect(markEventProcessed).toHaveBeenCalledWith(ev.id);
  });

  it('marks event with error and rethrows when handler fails', async () => {
    const ev = event('invoice.paid', { id: 'in_1' });
    constructEvent.mockReturnValue(ev);
    tryRegisterEvent.mockResolvedValue(true);
    upsertInvoiceFromStripe.mockRejectedValue(new Error('boom'));
    markEventProcessed.mockResolvedValue(undefined);
    await expect(controller.handle(reqWith(Buffer.from('{}')), 'sig')).rejects.toThrow('boom');
    expect(markEventProcessed).toHaveBeenCalledWith(ev.id, 'boom');
  });
});
