import { Customer } from './customer.entity';

describe('Customer', () => {
  it('links a customer to company and optional user', () => {
    const customer = new Customer();
    customer.companyId = 'company-1';
    customer.name = 'Maria';
    customer.email = 'maria@ex.com';
    customer.phone = '+5511888888888';
    customer.userId = 'user-1';
    customer.notes = 'VIP';

    expect(customer.companyId).toBe('company-1');
    expect(customer.userId).toBe('user-1');
    expect(customer.notes).toBe('VIP');
  });

  it('allows guest customers without email, phone or user', () => {
    const customer = new Customer();
    customer.companyId = 'company-1';
    customer.name = 'Walk-in';
    customer.email = null;
    customer.phone = null;
    customer.userId = null;
    customer.notes = null;

    expect(customer.email).toBeNull();
    expect(customer.phone).toBeNull();
    expect(customer.userId).toBeNull();
  });
});
