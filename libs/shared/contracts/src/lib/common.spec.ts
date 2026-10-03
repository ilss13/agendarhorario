import { z } from 'zod';
import {
  emailSchema,
  paginatedResultSchema,
  paginationQuerySchema,
  passwordSchema,
  phoneSchema,
  slugSchema,
  uuidSchema,
} from './common';

describe('common contracts', () => {
  it('accepts a uuid and rejects a plain string', () => {
    expect(uuidSchema.safeParse('11111111-1111-4111-8111-111111111111').success).toBe(true);
    expect(uuidSchema.safeParse('nao-uuid').success).toBe(false);
  });

  it('lowercases a valid email and rejects an empty one', () => {
    const valid = emailSchema.safeParse('  Ana@Studio.com ');
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data).toBe('ana@studio.com');
    expect(emailSchema.safeParse('   ').success).toBe(false);
    expect(emailSchema.safeParse('nao-e-email').success).toBe(false);
  });

  it('accepts a strong password and rejects each missing rule', () => {
    expect(passwordSchema.safeParse('Senha123').success).toBe(true);
    expect(passwordSchema.safeParse('curta1A').success).toBe(false);
    expect(passwordSchema.safeParse('senhasem1').success).toBe(false);
    expect(passwordSchema.safeParse('SENHASEM1').success).toBe(false);
    expect(passwordSchema.safeParse('SenhaSemNumero').success).toBe(false);
  });

  it('accepts an E.164 phone and rejects letters', () => {
    expect(phoneSchema.safeParse(' +5511999999999 ').success).toBe(true);
    expect(phoneSchema.safeParse('119999').success).toBe(false);
  });

  it('normalizes a slug and rejects invalid shapes', () => {
    const valid = slugSchema.safeParse('  Salao-Centro ');
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data).toBe('salao-centro');
    expect(slugSchema.safeParse('ab').success).toBe(false);
    expect(slugSchema.safeParse(`${'a'.repeat(61)}`).success).toBe(false);
    expect(slugSchema.safeParse('salao_centro').success).toBe(false);
    expect(slugSchema.safeParse('-salao').success).toBe(false);
  });

  it('applies pagination defaults and rejects a page below 1', () => {
    const defaults = paginationQuerySchema.safeParse({});
    expect(defaults.success).toBe(true);
    if (defaults.success) {
      expect(defaults.data.page).toBe(1);
      expect(defaults.data.pageSize).toBe(20);
    }
    expect(paginationQuerySchema.safeParse({ page: '0', pageSize: '200' }).success).toBe(false);
    const searched = paginationQuerySchema.safeParse({ page: '2', pageSize: '10', q: ' corte ' });
    expect(searched.success).toBe(true);
    if (searched.success) expect(searched.data.q).toBe('corte');
  });

  it('wraps a list and rejects a negative total', () => {
    const schema = paginatedResultSchema(z.object({ id: uuidSchema }));
    expect(
      schema.safeParse({
        items: [{ id: '11111111-1111-4111-8111-111111111111' }],
        total: 1,
        page: 1,
        pageSize: 20,
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ items: [], total: -1, page: 1, pageSize: 20 }).success).toBe(false);
  });
});
