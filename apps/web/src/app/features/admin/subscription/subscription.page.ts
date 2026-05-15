import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ConfirmDialogComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { BillingApi } from '@agendarhorario/web-data-access';
import type {
  InvoiceDto,
  PlanCode,
  PlanDto,
  SubscriptionSummaryDto,
} from '@agendarhorario/contracts';
import { formatBrDateTime } from '@agendarhorario/utils';
import type { ApiError } from '../../../core/http/error.interceptor';

@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, SpinnerComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Assinatura" subtitle="Gerencie seu plano, uso do mês e faturas." />

    @if (loading() && !summary()) {
      <div class="loading"><app-spinner /></div>
    } @else if (loadError()) {
      <app-empty-state
        title="Não foi possível carregar"
        [description]="loadError()"
        actionLabel="Tentar novamente"
        (action)="load()"
      />
    } @else {
      <section class="card">
        @if (summary()?.hasSubscription && summary()?.plan) {
          <header class="plan">
            <div>
              <small class="muted">Plano atual</small>
              <h2>{{ summary()!.plan!.name }}</h2>
              <small class="muted">
                R$ {{ summary()!.plan!.priceBrl.toFixed(2) }}/mês ·
                {{ summary()!.plan!.monthlyAppointmentLimit }} agendamentos/mês
              </small>
            </div>
            <span class="status" [attr.data-state]="summary()!.state">
              {{ stateLabel(summary()!.state) }}
            </span>
          </header>

          <div class="usage">
            <div class="usage-header">
              <span>Uso do ciclo</span>
              <strong>{{ summary()!.usage.used }} / {{ summary()!.usage.limit }}</strong>
            </div>
            <div class="bar" [attr.data-level]="usageLevel()">
              <div class="fill" [style.width.%]="usagePercent()"></div>
            </div>
            @if (summary()!.usage.resetAt) {
              <small class="muted"> Renova em {{ formatDate(summary()!.usage.resetAt!) }} </small>
            }
          </div>

          @if (summary()!.state === 'OVER_LIMIT') {
            <p class="warning">
              Você atingiu o limite deste ciclo. Faça upgrade para continuar recebendo agendamentos
              imediatamente.
            </p>
          } @else if (summary()!.state === 'SUSPENDED') {
            <p class="error">
              Sua assinatura está com problemas de pagamento. Atualize o método para reativar.
            </p>
          }

          <div class="actions">
            <button type="button" class="secondary" (click)="openPortal()">
              Atualizar método de pagamento
            </button>
            <button type="button" class="primary" (click)="openPlanModal()">Trocar plano</button>
            @if (!summary()!.cancelAtPeriodEnd) {
              <button type="button" class="danger" (click)="confirmingCancel.set(true)">
                Cancelar assinatura
              </button>
            } @else {
              <span class="muted">
                Será cancelada em {{ formatDate(summary()!.currentPeriodEnd!) }}
              </span>
            }
          </div>
        } @else {
          <h2>Você ainda não tem um plano ativo</h2>
          <p class="muted">Escolha um plano para liberar agendamentos públicos para sua empresa.</p>
          <div class="actions">
            <button type="button" class="primary" (click)="openPlanModal()">Escolher plano</button>
          </div>
        }
      </section>

      <h3 class="section">Faturas</h3>
      @if (invoices().length === 0) {
        <app-empty-state
          title="Nenhuma fatura ainda"
          description="As faturas aparecerão aqui após a primeira cobrança."
        />
      } @else {
        <ul class="invoice-list">
          @for (i of invoices(); track i.id) {
            <li>
              <div>
                <strong>{{ i.number ?? '—' }}</strong>
                <small>{{ formatDate(i.createdAt) }}</small>
              </div>
              <div class="amount">R$ {{ i.amountTotal.toFixed(2) }}</div>
              <span class="badge badge-{{ i.status }}">{{ invoiceLabel(i.status) }}</span>
              <div class="links">
                @if (i.hostedInvoiceUrl) {
                  <a [href]="i.hostedInvoiceUrl" target="_blank" rel="noopener">Pagar / ver</a>
                }
                @if (i.pdfUrl) {
                  <a [href]="i.pdfUrl" target="_blank" rel="noopener">PDF</a>
                }
              </div>
            </li>
          }
        </ul>
      }
    }

    @if (planModalOpen()) {
      <div class="modal-backdrop" (click)="planModalOpen.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <header>
            <h2>Escolha um plano</h2>
            <button type="button" class="close" (click)="planModalOpen.set(false)">×</button>
          </header>
          @if (plans().length === 0) {
            <p class="muted">Carregando planos...</p>
          } @else {
            <ul class="plan-grid">
              @for (p of plans(); track p.id) {
                <li
                  [class.current]="p.code === summary()?.plan?.code"
                  [class.recommended]="p.code === 'medio'"
                >
                  @if (p.code === 'medio') {
                    <span class="recommended-badge">Mais escolhido</span>
                  }
                  <strong>{{ p.name }}</strong>
                  <span class="price">R$ {{ p.priceBrl.toFixed(2) }}<small>/mês</small></span>
                  <span class="limit">{{ p.monthlyAppointmentLimit }} agendamentos</span>
                  <button
                    type="button"
                    class="primary"
                    [disabled]="submitting() || p.code === summary()?.plan?.code"
                    (click)="onSelectPlan(p)"
                  >
                    {{
                      summary()?.hasSubscription
                        ? p.code === summary()?.plan?.code
                          ? 'Plano atual'
                          : 'Trocar para este'
                        : 'Assinar'
                    }}
                  </button>
                </li>
              }
            </ul>
          }
          @if (actionError()) {
            <p class="error">{{ actionError() }}</p>
          }
        </div>
      </div>
    }

    <app-confirm-dialog
      [open]="confirmingCancel()"
      title="Cancelar assinatura"
      message="A assinatura será cancelada ao fim do ciclo atual e os agendamentos continuam ativos até lá."
      confirmLabel="Cancelar assinatura"
      cancelLabel="Voltar"
      (confirmed)="doCancel()"
      (cancelled)="confirmingCancel.set(false)"
    />
  `,
  styles: [
    `
      .loading {
        display: grid;
        place-items: center;
        padding: 3rem 0;
      }
      .card {
        background: #fff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        display: grid;
        gap: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .plan {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        justify-content: space-between;
      }
      .plan h2 {
        margin: 0.25rem 0;
        font-size: 1.4rem;
      }
      .muted {
        color: #6b7280;
      }
      .status {
        font-weight: 700;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        background: #f3f4f6;
      }
      .status[data-state='AVAILABLE'] {
        background: #ecfdf5;
        color: #047857;
      }
      .status[data-state='OVER_LIMIT'] {
        background: #fef3c7;
        color: #b45309;
      }
      .status[data-state='SUSPENDED'] {
        background: #fee2e2;
        color: #b91c1c;
      }
      .status[data-state='NO_SUBSCRIPTION'] {
        background: #e0e7ff;
        color: #1d4ed8;
      }
      .usage-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
      }
      .bar {
        height: 10px;
        border-radius: 999px;
        background: #f3f4f6;
        overflow: hidden;
      }
      .bar .fill {
        height: 100%;
        background: #16a34a;
        transition: width 0.3s ease;
      }
      .bar[data-level='warn'] .fill {
        background: #f59e0b;
      }
      .bar[data-level='danger'] .fill {
        background: #dc2626;
      }
      .warning {
        background: #fef3c7;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        margin: 0;
      }
      .error {
        background: #fee2e2;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        margin: 0;
        color: #b91c1c;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      button {
        padding: 0.55rem 1rem;
        border: 0;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
      }
      button.primary {
        background: #2563eb;
        color: #fff;
      }
      button.secondary {
        background: #f3f4f6;
        color: #111827;
        border: 1px solid #d1d5db;
      }
      button.danger {
        background: #fee2e2;
        color: #b91c1c;
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .section {
        margin: 1.5rem 0 0.75rem;
        font-size: 1.05rem;
      }
      ul.invoice-list {
        list-style: none;
        margin: 0;
        padding: 0;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        overflow: hidden;
      }
      ul.invoice-list li {
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 0.75rem;
        align-items: center;
        padding: 0.85rem 1rem;
        border-top: 1px solid #f3f4f6;
      }
      ul.invoice-list li:first-child {
        border-top: 0;
      }
      ul.invoice-list small {
        display: block;
        color: #6b7280;
      }
      .amount {
        font-variant-numeric: tabular-nums;
      }
      .badge {
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        background: #f3f4f6;
        color: #374151;
      }
      .badge-paid {
        background: #ecfdf5;
        color: #047857;
      }
      .badge-open {
        background: #fef3c7;
        color: #b45309;
      }
      .badge-uncollectible,
      .badge-void {
        background: #fee2e2;
        color: #b91c1c;
      }
      .links {
        display: flex;
        gap: 0.5rem;
      }
      .links a {
        color: #2563eb;
        text-decoration: none;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: grid;
        place-items: center;
        z-index: 60;
        padding: 1rem;
      }
      .modal {
        background: #fff;
        border-radius: 1rem;
        max-width: 720px;
        width: 100%;
        max-height: 90vh;
        overflow: auto;
        padding: 1.5rem;
      }
      .modal header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .modal .close {
        background: transparent;
        border: 0;
        font-size: 1.4rem;
        cursor: pointer;
      }
      ul.plan-grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
      }
      ul.plan-grid li {
        position: relative;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1rem;
        display: grid;
        gap: 0.5rem;
        background: #fff;
      }
      ul.plan-grid li.recommended {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
      }
      ul.plan-grid li.current {
        border-color: #16a34a;
      }
      .recommended-badge {
        position: absolute;
        top: -10px;
        right: 12px;
        background: #2563eb;
        color: #fff;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
      }
      .price {
        font-size: 1.4rem;
        font-weight: 700;
      }
      .price small {
        font-size: 0.85rem;
        color: #6b7280;
        font-weight: 500;
      }
      .limit {
        color: #6b7280;
      }
    `,
  ],
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

  readonly usagePercent = computed(() => {
    const s = this.summary();
    if (!s?.usage?.limit) return 0;
    return Math.min(100, Math.round((s.usage.used / s.usage.limit) * 100));
  });

  readonly usageLevel = computed<'ok' | 'warn' | 'danger'>(() => {
    const pct = this.usagePercent();
    if (pct >= 90) return 'danger';
    if (pct >= 70) return 'warn';
    return 'ok';
  });

  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.load();
    const preselected = this.route.snapshot.queryParamMap.get('plan');
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
    this.api.invoices().subscribe({
      next: (inv) => this.invoices.set(inv),
      error: () => this.invoices.set([]),
    });
  }

  openPlanModal(): void {
    this.actionError.set(null);
    this.planModalOpen.set(true);
    if (this.plans().length === 0) {
      this.api.plans().subscribe({
        next: (p) => this.plans.set(p),
        error: (err: ApiError) => this.actionError.set(err.message ?? 'Erro ao carregar planos'),
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
    return formatBrDateTime(iso);
  }

  stateLabel(state: SubscriptionSummaryDto['state']): string {
    switch (state) {
      case 'AVAILABLE':
        return 'Ativa';
      case 'OVER_LIMIT':
        return 'Limite atingido';
      case 'SUSPENDED':
        return 'Suspensa';
      case 'NO_SUBSCRIPTION':
        return 'Sem plano';
    }
  }

  invoiceLabel(status: InvoiceDto['status']): string {
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
  }
}
