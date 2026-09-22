import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { BillingEvent } from './billing-event.entity';

describe('BillingEvent entity', () => {
  it('maps to the billing_events table', () => {
    const table = getMetadataArgsStorage().tables.find((t) => t.target === BillingEvent);
    expect(table?.name).toBe('billing_events');
  });

  it('enforces unique eventId for Stripe idempotency', () => {
    const indices = getMetadataArgsStorage().indices.filter((i) => i.target === BillingEvent);
    expect(indices.some((i) => i.name === 'ix_billing_events_event' && i.unique === true)).toBe(
      true,
    );
  });

  it('declares payload and processing columns', () => {
    const columns = getMetadataArgsStorage().columns.filter((c) => c.target === BillingEvent);
    const names = columns.map((c) => c.propertyName);
    expect(names).toEqual(
      expect.arrayContaining([
        'provider',
        'eventId',
        'type',
        'payload',
        'receivedAt',
        'processedAt',
        'errorMessage',
      ]),
    );
  });

  it('fails structural check when eventId is absent', () => {
    const incomplete = { type: 'invoice.paid', provider: 'stripe' } as Partial<BillingEvent>;
    expect(incomplete.eventId).toBeUndefined();
  });
});
