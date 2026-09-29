import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ConfirmDialogComponent,
  EmptyStateComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { BillingApi } from '@agendarhorario/web-data-access';
import type { InvoiceDto, PlanDto, SubscriptionSummaryDto } from '@agendarhorario/contracts';
import type { ApiError } from '../../../core/http/error.interceptor';
import {
  formatBrl,
  formatSubscriptionMoment,
  invoiceStatusLabel,
  isFeaturedPlan,
  planActionLabel,
  subscriptionStatusLabel,
  subscriptionStatusTone,
  usageLevel as usageBand,
  usagePercent as usageRatio,
} from './subscription.logic';

@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [EmptyStateComponent, SpinnerComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription.page.html',
  styleUrl: './subscription.page.scss',
})
export class SubscriptionPageComponent {
  private readonly api = inject(BillingApi);

  readonly summary = signal<SubscriptionSummaryDto | null>(null);
  readonly invoices = signal<InvoiceDto[]>([]);
  readonly plans = signal<PlanDto[]>([]);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly planModalOpen = signal(false);
  readonly confirmingCancel = signal(false);
  readonly loadingPlans = signal(false);
  readonly confirmingReturn = signal(false);

  readonly usagePercent = computed(() => {
    const usage = this.summary()?.usage;
    return usage ? usageRatio(usage.used, usage.limit) : 0;
  });

  readonly usageLevel = computed(() => usageBand(this.usagePercent()));

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    const sessionId = qp.get('session_id');
    const status = qp.get('status');
    if (status === 'ok' || sessionId) {
      this.confirmReturn(sessionId);
    } else {
      this.load();
    }
    const preselected = qp.get('plan');
    if (preselected) {
      // pré-abre o modal se chegou da landing com ?plan=X
      queueMicrotask(() => this.openPlanModal());
    }
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.subscription().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar');
      },
    });
    this.loadInvoices();
  }

  private confirmReturn(sessionId: string | null, attempt = 0): void {
    this.loading.set(true);
    this.confirmingReturn.set(true);
    this.loadError.set(null);
    this.api.confirmCheckout(sessionId ? { sessionId } : {}).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loadInvoices();
        if (!s.hasSubscription && attempt < 4) {
          window.setTimeout(() => this.confirmReturn(sessionId, attempt + 1), 1500);
          return;
        }
        this.loading.set(false);
        this.confirmingReturn.set(false);
        if (s.hasSubscription) this.stripReturnParams();
      },
      error: () => {
        this.confirmingReturn.set(false);
        this.load();
      },
    });
  }

  private stripReturnParams(): void {
    const plan = this.route.snapshot.queryParamMap.get('plan');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: plan ? { plan } : {},
      replaceUrl: true,
    });
  }

  private loadInvoices(): void {
    this.api.invoices().subscribe({
      next: (inv) => this.invoices.set(inv),
      error: () => this.invoices.set([]),
    });
  }

  openPlanModal(): void {
    this.actionError.set(null);
    this.planModalOpen.set(true);
    if (this.plans().length === 0) {
      this.loadingPlans.set(true);
      this.api.plans().subscribe({
        next: (p) => {
          this.plans.set(p);
          this.loadingPlans.set(false);
        },
        error: (err: ApiError) => {
          this.loadingPlans.set(false);
          this.actionError.set(err.message ?? 'Erro ao carregar planos');
        },
      });
    }
  }

  onSelectPlan(plan: PlanDto): void {
    if (plan.code === this.summary()?.plan?.code) return;
    this.submitting.set(true);
    this.actionError.set(null);
    if (this.summary()?.hasSubscription) {
      this.api.changePlan({ planCode: plan.code }).subscribe({
        next: (next) => {
          this.submitting.set(false);
          this.planModalOpen.set(false);
          this.summary.set(next);
          this.load();
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.actionError.set(err.message ?? 'Erro ao trocar de plano');
        },
      });
    } else {
      this.api.checkout({ planCode: plan.code }).subscribe({
        next: (res) => {
          this.submitting.set(false);
          window.location.href = res.url;
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.actionError.set(err.message ?? 'Erro ao iniciar checkout');
        },
      });
    }
  }

  openPortal(): void {
    this.actionError.set(null);
    this.api.portal().subscribe({
      next: (res) => (window.location.href = res.url),
      error: (err: ApiError) => this.actionError.set(err.message ?? 'Erro ao abrir portal'),
    });
  }

  doCancel(): void {
    this.confirmingCancel.set(false);
    this.api.cancel().subscribe({
      next: (s) => this.summary.set(s),
      error: (err: ApiError) => this.actionError.set(err.message ?? 'Erro ao cancelar'),
    });
  }

  formatDate(iso: string): string {
    return formatSubscriptionMoment(iso, true);
  }

  formatDay(iso: string): string {
    return formatSubscriptionMoment(iso, false);
  }

  money(value: number): string {
    return formatBrl(value);
  }

  featured(plan: PlanDto): boolean {
    return isFeaturedPlan(plan.code);
  }

  currentPlan(plan: PlanDto): boolean {
    return plan.code === this.summary()?.plan?.code;
  }

  planLabel(plan: PlanDto, compact: boolean): string {
    const summary = this.summary();
    return planActionLabel({
      hasSubscription: summary?.hasSubscription ?? false,
      isCurrent: this.currentPlan(plan),
      trialEligible: summary?.trialEligible ?? false,
      compact,
    });
  }

  stateLabel(state: SubscriptionSummaryDto['state']): string {
    return subscriptionStatusLabel(null, state);
  }

  statusLabel(): string {
    return subscriptionStatusLabel(this.summary()?.status, this.summary()?.state);
  }

  statusTone(): string {
    return subscriptionStatusTone(this.summary()?.status, this.summary()?.state);
  }

  invoiceLabel(status: InvoiceDto['status']): string {
    return invoiceStatusLabel(status);
  }
}
