import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { InvoiceDto, PlanDto, SubscriptionSummaryDto } from '@agendarhorario/contracts';
import { BillingApi } from '@agendarhorario/web-data-access';
import { SubscriptionPageComponent } from './subscription.page';

const plan = (code: PlanDto['code']): PlanDto => ({
  id: '11111111-1111-4111-8111-111111111111',
  code,
  name: code,
  priceBrl: 49,
  monthlyAppointmentLimit: 25,
  stripePriceId: 'price',
  sortOrder: 1,
  trialDays: 14,
});

const summary = (patch: Partial<SubscriptionSummaryDto> = {}): SubscriptionSummaryDto => ({
  hasSubscription: true,
  plan: plan('basico'),
  status: 'active',
  state: 'AVAILABLE',
  cancelAtPeriodEnd: false,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  trialEligible: false,
  trialEndsAt: null,
  trialDays: 14,
  usage: { used: 1, limit: 25, resetAt: null },
  ...patch,
});

const invoice = (status: InvoiceDto['status']): InvoiceDto => ({
  id: '44444444-4444-4444-8444-444444444444',
  stripeInvoiceId: 'in_1',
  number: '0001',
  amountTotal: 4900,
  currency: 'brl',
  status,
  dueDate: null,
  paidAt: null,
  hostedInvoiceUrl: null,
  pdfUrl: null,
  createdAt: '2026-09-01T00:00:00.000Z',
});

describe('SubscriptionPageComponent', () => {
  const api = {
    subscription: jest.fn(),
    invoices: jest.fn(),
    plans: jest.fn(),
    changePlan: jest.fn(),
    checkout: jest.fn(),
    portal: jest.fn(),
    cancel: jest.fn(),
    confirmCheckout: jest.fn(),
  };

  const setup = (query: Record<string, string> = {}): SubscriptionPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SubscriptionPageComponent],
      providers: [
        provideRouter([]),
        { provide: BillingApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return TestBed.createComponent(SubscriptionPageComponent).componentInstance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.invoices.mockReturnValue(of([invoice('paid')]));
    api.subscription.mockReturnValue(of(summary()));
    api.plans.mockReturnValue(of([]));
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/dashboard/assinatura' },
    });
  });

  it('loads the summary, invoices and usage bands', () => {
    const page = setup();
    expect(page.summary()?.state).toBe('AVAILABLE');
    expect(page.usageLevel()).toBe('ok');
    expect(page.formatDate('2026-09-01T00:00:00.000Z')).toContain('2026');
    expect(page.stateLabel('AVAILABLE')).toBe('Ativa');
    expect(page.stateLabel('OVER_LIMIT')).toBe('Limite atingido');
    expect(page.stateLabel('SUSPENDED')).toBe('Suspensa');
    expect(page.stateLabel('NO_SUBSCRIPTION')).toBe('Sem plano');
    expect(page.statusLabel()).toBe('Ativa');
    expect(page.statusTone()).toBe('AVAILABLE');
    expect(page.invoiceLabel('paid')).toBe('Paga');
    expect(page.invoiceLabel('open')).toBe('Em aberto');
    expect(page.invoiceLabel('draft')).toBe('Rascunho');
    expect(page.invoiceLabel('uncollectible')).toBe('Não cobrável');
    expect(page.invoiceLabel('void')).toBe('Anulada');

    page.summary.set(summary({ usage: { used: 18, limit: 25, resetAt: null } }));
    expect(page.usageLevel()).toBe('warn');
    page.summary.set(summary({ usage: { used: 25, limit: 25, resetAt: null } }));
    expect(page.usagePercent()).toBe(100);
    expect(page.usageLevel()).toBe('danger');
    page.summary.set(summary({ usage: { used: 1, limit: 0, resetAt: null } }));
    expect(page.usagePercent()).toBe(0);
    page.summary.set(summary({ status: 'trialing', state: 'AVAILABLE' }));
    expect(page.statusLabel()).toBe('Em teste');
    expect(page.statusTone()).toBe('TRIALING');
    page.summary.set(null);
    expect(page.statusLabel()).toBe('Sem plano');
    expect(page.usagePercent()).toBe(0);

    api.invoices.mockReturnValue(throwError(() => new Error('no')));
    page.load();
    expect(page.invoices()).toEqual([]);
    api.subscription.mockReturnValue(throwError(() => ({})));
    page.load();
    expect(page.loadError()).toBe('Erro ao carregar');
  });

  it('changes the plan, starts checkout and opens the portal', () => {
    const page = setup();
    page.onSelectPlan(plan('basico'));
    expect(api.changePlan).not.toHaveBeenCalled();

    api.plans.mockReturnValue(of([plan('medio')]));
    page.openPlanModal();
    expect(page.plans()).toHaveLength(1);
    page.openPlanModal();
    expect(api.plans).toHaveBeenCalledTimes(1);

    api.changePlan.mockReturnValue(of(summary({ plan: plan('medio') })));
    page.onSelectPlan(plan('medio'));
    expect(page.planModalOpen()).toBe(false);

    api.changePlan.mockReturnValue(throwError(() => ({})));
    page.onSelectPlan(plan('grande'));
    expect(page.actionError()).toBe('Erro ao trocar de plano');

    page.summary.set(summary({ hasSubscription: false, plan: null }));
    api.checkout.mockReturnValue(of({ url: 'https://checkout.test' }));
    page.onSelectPlan(plan('medio'));
    expect(window.location.href).toBe('https://checkout.test');
    api.checkout.mockReturnValue(throwError(() => ({})));
    page.onSelectPlan(plan('super'));
    expect(page.actionError()).toBe('Erro ao iniciar checkout');

    api.portal.mockReturnValue(of({ url: 'https://portal.test' }));
    page.openPortal();
    expect(window.location.href).toBe('https://portal.test');
    api.portal.mockReturnValue(throwError(() => ({})));
    page.openPortal();
    expect(page.actionError()).toBe('Erro ao abrir portal');

    api.cancel.mockReturnValue(of(summary({ state: 'SUSPENDED' })));
    page.confirmingCancel.set(true);
    page.doCancel();
    expect(page.summary()?.state).toBe('SUSPENDED');
    api.cancel.mockReturnValue(throwError(() => ({})));
    page.doCancel();
    expect(page.actionError()).toBe('Erro ao cancelar');

    api.plans.mockReturnValue(throwError(() => ({})));
    page.plans.set([]);
    page.openPlanModal();
    expect(page.actionError()).toBe('Erro ao carregar planos');
  });

  it('confirms a checkout return and keeps the selected plan in the url', fakeAsync(() => {
    const pending = summary({ hasSubscription: false, plan: null, state: 'NO_SUBSCRIPTION' });
    api.confirmCheckout.mockReturnValueOnce(of(pending)).mockReturnValueOnce(of(summary()));
    api.invoices.mockReturnValue(of([]));
    const page = setup({ status: 'ok', session_id: 'cs_test', plan: 'medio' });
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    flushMicrotasks();
    expect(page.confirmingReturn()).toBe(true);
    tick(1500);
    flushMicrotasks();
    expect(page.summary()?.hasSubscription).toBe(true);
    expect(page.confirmingReturn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { plan: 'medio' },
      replaceUrl: true,
    });
    expect(page.planModalOpen()).toBe(true);
  }));

  it('stops retrying and falls back to a plain load', fakeAsync(() => {
    api.confirmCheckout.mockReturnValue(of(summary({ hasSubscription: false, plan: null })));
    const page = setup({ session_id: 'cs_test' });
    flushMicrotasks();
    tick(1500 * 4);
    flushMicrotasks();
    expect(page.loading()).toBe(false);
    expect(api.confirmCheckout).toHaveBeenCalledTimes(5);

    api.confirmCheckout.mockReturnValue(of(summary()));
    const done = setup({ status: 'ok' });
    flushMicrotasks();
    expect(done.confirmingReturn()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {},
      replaceUrl: true,
    });

    api.confirmCheckout.mockReturnValue(throwError(() => new Error('no')));
    api.subscription.mockReturnValue(of(summary()));
    const failed = setup({ status: 'ok' });
    flushMicrotasks();
    expect(failed.confirmingReturn()).toBe(false);
    expect(api.subscription).toHaveBeenCalled();
  }));
});
