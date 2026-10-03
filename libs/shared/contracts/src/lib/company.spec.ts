import { companySchema, secondaryChannelSchema, updateCompanyRequestSchema } from './company';

const id = '11111111-1111-4111-8111-111111111111';

const company = {
  id,
  name: 'Salao',
  slug: 'salao',
  phone: null,
  email: null,
  timezone: 'America/Sao_Paulo',
  logoUrl: null,
  notificationPrefs: { email: true, secondaryChannel: 'NONE' as const },
};

describe('company contracts', () => {
  it('accepts a company and a partial update', () => {
    expect(companySchema.safeParse(company).success).toBe(true);
    expect(secondaryChannelSchema.safeParse('WHATSAPP').success).toBe(true);
    const updated = updateCompanyRequestSchema.safeParse({ name: ' Salao Centro ', phone: null });
    expect(updated.success).toBe(true);
    if (updated.success) expect(updated.data.name).toBe('Salao Centro');
  });

  it('rejects an empty update and an unknown channel', () => {
    expect(updateCompanyRequestSchema.safeParse({}).success).toBe(false);
    expect(secondaryChannelSchema.safeParse('EMAIL').success).toBe(false);
    expect(updateCompanyRequestSchema.safeParse({ slug: 'A' }).success).toBe(false);
  });
});
