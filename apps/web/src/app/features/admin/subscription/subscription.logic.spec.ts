import {
  formatBrl,
  formatSubscriptionMoment,
  invoiceStatusLabel,
  isFeaturedPlan,
  planActionLabel,
  subscriptionStatusLabel,
  subscriptionStatusTone,
  usageLevel,
  usagePercent,
} from './subscription.logic';

describe('subscription display', () => {
  it('clamps usage and maps the warning bands', () => {
    expect(usagePercent(0, 25)).toBe(0);
    expect(usagePercent(18, 25)).toBe(72);
    expect(usageLevel(72)).toBe('warn');
    expect(usagePercent(25, 25)).toBe(100);
    expect(usageLevel(100)).toBe('danger');
    expect(usageLevel(10)).toBe('ok');
  });

  it('treats a missing limit as empty usage', () => {
    expect(usagePercent(4, 0)).toBe(0);
    expect(usagePercent(4, -1)).toBe(0);
  });

  it('labels subscription and invoice states', () => {
    expect(subscriptionStatusLabel('trialing', 'AVAILABLE')).toBe('Em teste');
    expect(subscriptionStatusTone('trialing', 'AVAILABLE')).toBe('TRIALING');
    expect(subscriptionStatusLabel('active', 'AVAILABLE')).toBe('Ativa');
    expect(subscriptionStatusLabel('past_due', 'OVER_LIMIT')).toBe('Limite atingido');
    expect(subscriptionStatusLabel('unpaid', 'SUSPENDED')).toBe('Suspensa');
    expect(subscriptionStatusLabel(null, 'NO_SUBSCRIPTION')).toBe('Sem plano');
    expect(subscriptionStatusLabel(null, null)).toBe('Sem plano');
    expect(subscriptionStatusTone('active', 'AVAILABLE')).toBe('AVAILABLE');
    expect(subscriptionStatusTone(null, null)).toBe('NO_SUBSCRIPTION');
    expect(invoiceStatusLabel('paid')).toBe('Paga');
    expect(invoiceStatusLabel('open')).toBe('Em aberto');
    expect(invoiceStatusLabel('draft')).toBe('Rascunho');
    expect(invoiceStatusLabel('uncollectible')).toBe('Não cobrável');
    expect(invoiceStatusLabel('void')).toBe('Anulada');
  });

  it('formats money and renewal moments in pt-BR', () => {
    expect(formatBrl(39.9)).toContain('39,90');
    expect(formatBrl(0)).toContain('0,00');
    expect(formatSubscriptionMoment('2026-10-05T14:54:00.000Z', true)).toBe('05/10/2026 11:54');
    expect(formatSubscriptionMoment('2026-10-05T14:54:00.000Z', false)).toBe('05/10/2026');
  });

  it('rejects an invalid instant', () => {
    expect(formatSubscriptionMoment('amanha', true)).toBe('');
  });

  it('marks the featured plan and the action label', () => {
    expect(isFeaturedPlan('medio')).toBe(true);
    expect(isFeaturedPlan('basico')).toBe(false);
    expect(
      planActionLabel({
        hasSubscription: true,
        isCurrent: true,
        trialEligible: false,
        compact: false,
      }),
    ).toBe('Plano atual');
    expect(
      planActionLabel({
        hasSubscription: true,
        isCurrent: true,
        trialEligible: false,
        compact: true,
      }),
    ).toBe('Atual');
    expect(
      planActionLabel({
        hasSubscription: true,
        isCurrent: false,
        trialEligible: false,
        compact: false,
      }),
    ).toBe('Trocar para este');
    expect(
      planActionLabel({
        hasSubscription: false,
        isCurrent: false,
        trialEligible: true,
        compact: false,
      }),
    ).toBe('Começar teste grátis');
    expect(
      planActionLabel({
        hasSubscription: false,
        isCurrent: false,
        trialEligible: false,
        compact: true,
      }),
    ).toBe('Assinar');
  });
});
