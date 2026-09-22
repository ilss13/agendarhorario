import { COMPANY_APP_BASE, defaultRouteForUser } from './redirect-after-login';

describe('defaultRouteForUser', () => {
  it('sends company users to the dashboard', () => {
    expect(defaultRouteForUser({ role: 'OWNER' })).toBe(COMPANY_APP_BASE);
    expect(defaultRouteForUser({ role: 'STAFF' })).toBe('/dashboard');
  });

  it('sends customers to their appointments', () => {
    expect(defaultRouteForUser({ role: 'CUSTOMER' })).toBe('/me/agendamentos');
  });
});
