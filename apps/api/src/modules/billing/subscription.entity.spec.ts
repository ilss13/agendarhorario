import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { Subscription } from './subscription.entity';

describe('Subscription entity', () => {
  it('maps to the subscriptions table', () => {
    const table = getMetadataArgsStorage().tables.find((t) => t.target === Subscription);
    expect(table?.name).toBe('subscriptions');
  });

  it('declares company and unique stripe indexes', () => {
    const indices = getMetadataArgsStorage().indices.filter((i) => i.target === Subscription);
    expect(indices.some((i) => i.name === 'ix_subscriptions_company')).toBe(true);
    expect(indices.some((i) => i.name === 'ix_subscriptions_stripe' && i.unique === true)).toBe(
      true,
    );
  });

  it('stores status as a Stripe-compatible enum', () => {
    const statusCol = getMetadataArgsStorage().columns.find(
      (c) => c.target === Subscription && c.propertyName === 'status',
    );
    expect(statusCol?.options.enum).toEqual([
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
    ]);
  });

  it('fails structural check when stripeSubscriptionId is absent', () => {
    const incomplete = { companyId: 'c1', planId: 'p1' } as Partial<Subscription>;
    expect(incomplete.stripeSubscriptionId).toBeUndefined();
  });
});
