import { Company, type NotificationPrefs } from './company.entity';

describe('Company', () => {
  it('stores company profile and billing identifiers', () => {
    const company = new Company();
    const prefs: NotificationPrefs = { email: true, secondaryChannel: 'SMS' };
    company.name = 'Salão';
    company.slug = 'salao';
    company.phone = '+5511999999999';
    company.email = 'contato@salao.com';
    company.timezone = 'America/Sao_Paulo';
    company.logoUrl = 'https://cdn/logo.png';
    company.notificationPrefs = prefs;
    company.stripeCustomerId = 'cus_1';
    company.stripeSubscriptionId = 'sub_1';

    expect(company.slug).toBe('salao');
    expect(company.timezone).toBe('America/Sao_Paulo');
    expect(company.notificationPrefs.secondaryChannel).toBe('SMS');
    expect(company.stripeCustomerId).toBe('cus_1');
  });

  it('allows nullable contact and stripe fields', () => {
    const company = new Company();
    company.name = 'X';
    company.slug = 'x';
    company.phone = null;
    company.email = null;
    company.logoUrl = null;
    company.stripeCustomerId = null;
    company.stripeSubscriptionId = null;
    company.notificationPrefs = { email: false, secondaryChannel: 'NONE' };

    expect(company.phone).toBeNull();
    expect(company.stripeSubscriptionId).toBeNull();
    expect(company.notificationPrefs.email).toBe(false);
  });
});
