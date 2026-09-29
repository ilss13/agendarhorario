import type { InvoiceDto, PlanCode, UsageState } from '@agendarhorario/contracts';
import { DateTime } from 'luxon';
import { APP_TIMEZONE } from '@agendarhorario/utils';

export type UsageLevel = 'ok' | 'warn' | 'danger';

export const usagePercent = (used: number, limit: number): number => {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

export const usageLevel = (percent: number): UsageLevel => {
  if (percent >= 90) return 'danger';
  if (percent >= 70) return 'warn';
  return 'ok';
};

export const subscriptionStatusLabel = (
  status: string | null | undefined,
  state: UsageState | null | undefined,
): string => {
  if (status === 'trialing') return 'Em teste';
  switch (state) {
    case 'AVAILABLE':
      return 'Ativa';
    case 'OVER_LIMIT':
      return 'Limite atingido';
    case 'SUSPENDED':
      return 'Suspensa';
    default:
      return 'Sem plano';
  }
};

export const subscriptionStatusTone = (
  status: string | null | undefined,
  state: UsageState | null | undefined,
): string => {
  if (status === 'trialing') return 'TRIALING';
  return state ?? 'NO_SUBSCRIPTION';
};

export const invoiceStatusLabel = (status: InvoiceDto['status']): string => {
  switch (status) {
    case 'paid':
      return 'Paga';
    case 'open':
      return 'Em aberto';
    case 'draft':
      return 'Rascunho';
    case 'uncollectible':
      return 'Não cobrável';
    case 'void':
      return 'Anulada';
  }
};

export const formatBrl = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatSubscriptionMoment = (iso: string, withTime: boolean): string => {
  const dt = DateTime.fromISO(iso, { zone: APP_TIMEZONE }).setLocale('pt-BR');
  if (!dt.isValid) return '';
  return dt.toFormat(withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
};

export const isFeaturedPlan = (code: PlanCode): boolean => code === 'medio';

export const planActionLabel = (input: {
  hasSubscription: boolean;
  isCurrent: boolean;
  trialEligible: boolean;
  compact: boolean;
}): string => {
  if (input.hasSubscription) {
    if (input.isCurrent) return input.compact ? 'Atual' : 'Plano atual';
    return input.compact ? 'Trocar' : 'Trocar para este';
  }
  return input.trialEligible ? 'Começar teste grátis' : 'Assinar';
};
