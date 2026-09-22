import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { Invoice } from './invoice.entity';

describe('Invoice entity', () => {
  it('maps to the invoices table', () => {
    const table = getMetadataArgsStorage().tables.find((t) => t.target === Invoice);
    expect(table?.name).toBe('invoices');
  });

  it('declares company and unique stripe invoice indexes', () => {
    const indices = getMetadataArgsStorage().indices.filter((i) => i.target === Invoice);
    expect(indices.some((i) => i.name === 'ix_invoices_company')).toBe(true);
    expect(indices.some((i) => i.name === 'ix_invoices_stripe' && i.unique === true)).toBe(true);
  });

  it('stores invoice status as a closed set of Stripe statuses', () => {
    const statusCol = getMetadataArgsStorage().columns.find(
      (c) => c.target === Invoice && c.propertyName === 'status',
    );
    expect(statusCol?.options.enum).toEqual(['draft', 'open', 'paid', 'uncollectible', 'void']);
  });

  it('fails structural check when stripeInvoiceId is absent', () => {
    const incomplete = { companyId: 'c1', amountTotal: 10 } as Partial<Invoice>;
    expect(incomplete.stripeInvoiceId).toBeUndefined();
  });
});
