jest.mock('@sentry/angular', () => ({
  getClient: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

import * as Sentry from '@sentry/angular';
import { trackBooking } from './booking-breadcrumb';

describe('trackBooking', () => {
  const getClient = Sentry.getClient as jest.Mock;
  const addBreadcrumb = Sentry.addBreadcrumb as jest.Mock;

  beforeEach(() => {
    getClient.mockReset();
    addBreadcrumb.mockReset();
  });

  it('skips the breadcrumb when Sentry is not initialized', () => {
    getClient.mockReturnValue(undefined);
    trackBooking('created');
    expect(addBreadcrumb).not.toHaveBeenCalled();
  });

  it('records a booking breadcrumb when a client exists', () => {
    getClient.mockReturnValue({});
    trackBooking('slot_selected', { serviceId: 'svc' });
    expect(addBreadcrumb).toHaveBeenCalledWith({
      category: 'booking',
      level: 'info',
      message: 'slot_selected',
      data: { serviceId: 'svc' },
    });
  });
});
