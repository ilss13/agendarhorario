import { shouldNotifyPlanSelection } from './plan-selection-notice';

describe('shouldNotifyPlanSelection', () => {
  it('notifies when a subscription first becomes active', () => {
    expect(
      shouldNotifyPlanSelection({
        previousPlanId: null,
        previousStatus: null,
        nextPlanId: 'plan-basico',
        nextStatus: 'active',
      }),
    ).toBe(true);
  });

  it('notifies when an incomplete subscription becomes trialing', () => {
    expect(
      shouldNotifyPlanSelection({
        previousPlanId: 'plan-basico',
        previousStatus: 'incomplete',
        nextPlanId: 'plan-basico',
        nextStatus: 'trialing',
      }),
    ).toBe(true);
  });

  it('notifies when the billable plan changes', () => {
    expect(
      shouldNotifyPlanSelection({
        previousPlanId: 'plan-basico',
        previousStatus: 'active',
        nextPlanId: 'plan-medio',
        nextStatus: 'active',
      }),
    ).toBe(true);
  });

  it('skips incomplete subscriptions', () => {
    expect(
      shouldNotifyPlanSelection({
        previousPlanId: null,
        previousStatus: null,
        nextPlanId: 'plan-basico',
        nextStatus: 'incomplete',
      }),
    ).toBe(false);
  });

  it('skips a refresh of the same billable plan', () => {
    expect(
      shouldNotifyPlanSelection({
        previousPlanId: 'plan-basico',
        previousStatus: 'trialing',
        nextPlanId: 'plan-basico',
        nextStatus: 'active',
      }),
    ).toBe(false);
  });

  it('skips cancellation', () => {
    expect(
      shouldNotifyPlanSelection({
        previousPlanId: 'plan-basico',
        previousStatus: 'active',
        nextPlanId: 'plan-basico',
        nextStatus: 'canceled',
      }),
    ).toBe(false);
  });
});
