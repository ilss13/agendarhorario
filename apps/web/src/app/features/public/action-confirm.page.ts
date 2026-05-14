import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionTokenApi } from '@agendarhorario/web-data-access';
import type { ActionPreviewDto } from '@agendarhorario/contracts';
import { EmptyStateComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { formatBrDateTime } from '@agendarhorario/utils';
import type { ApiError } from '../../core/http/error.interceptor';

@Component({
  selector: 'app-action-confirm-page',
  standalone: true,
  imports: [EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="loading"><app-spinner /></div>
      } @else if (loadError()) {
        <app-empty-state title="Link inválido ou expirado" [description]="loadError()" />
      } @else if (preview()) {
        <section class="card">
          <header>
            <h1>
              @if (preview()!.kind === 'CONFIRM') {
                Confirmar presença
              } @else {
                Cancelar agendamento
              }
            </h1>
            <p class="muted">{{ preview()!.appointment.companyName }}</p>
          </header>

          <dl>
            <div>
              <dt>Serviço</dt>
              <dd>{{ preview()!.appointment.serviceName }}</dd>
            </div>
            <div>
              <dt>Quando</dt>
              <dd>{{ formatDate(preview()!.appointment.startsAt) }}</dd>
            </div>
            <div>
              <dt>Cliente</dt>
              <dd>{{ preview()!.appointment.customerName }}</dd>
            </div>
            <div>
              <dt>Status atual</dt>
              <dd>{{ statusLabel(preview()!.appointment.status) }}</dd>
            </div>
          </dl>

          @if (result()) {
            <p class="success" role="status">
              @if (result()!.status === 'CONFIRMED') {
                Presença confirmada. Obrigado!
              } @else if (result()!.status === 'CANCELLED') {
                Agendamento cancelado.
              } @else {
                Status atualizado para {{ statusLabel(result()!.status) }}.
              }
            </p>
          } @else if (preview()!.alreadyConsumed) {
            <p class="muted" role="status">Este link já foi utilizado anteriormente.</p>
          } @else if (submitError()) {
            <p class="error" role="alert">{{ submitError() }}</p>
          } @else {
            <div class="actions">
              <button
                type="button"
                [class.primary]="preview()!.kind === 'CONFIRM'"
                [class.danger]="preview()!.kind === 'CANCEL'"
                (click)="submit()"
                [disabled]="submitting()"
              >
                @if (submitting()) {
                  Enviando...
                } @else if (preview()!.kind === 'CONFIRM') {
                  Confirmar presença
                } @else {
                  Cancelar agendamento
                }
              </button>
            </div>
          }
        </section>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #f5f5f7;
        min-height: 100dvh;
      }
      .wrap {
        max-width: 480px;
        margin: 0 auto;
        padding: 2.5rem 1rem;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 4rem 0;
      }
      .card {
        background: #fff;
        padding: 1.75rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        display: grid;
        gap: 1.25rem;
      }
      header h1 {
        margin: 0 0 0.25rem;
        font-size: 1.25rem;
      }
      .muted {
        color: #6b7280;
        margin: 0;
      }
      dl {
        margin: 0;
        display: grid;
        gap: 0.5rem;
      }
      dl div {
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #f3f4f6;
        padding-top: 0.5rem;
      }
      dl div:first-child {
        border-top: 0;
        padding-top: 0;
      }
      dt {
        color: #6b7280;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      button {
        padding: 0.7rem 1.25rem;
        border: 0;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
        color: #fff;
        background: #111827;
      }
      button.primary {
        background: #16a34a;
      }
      button.danger {
        background: #dc2626;
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .success {
        color: #047857;
      }
      .error {
        color: #dc2626;
      }
    `,
  ],
})
export class ActionConfirmPageComponent {
  private readonly api = inject(ActionTokenApi);
  private readonly route = inject(ActivatedRoute);

  readonly preview = signal<ActionPreviewDto | null>(null);
  readonly result = signal<{ status: ActionPreviewDto['appointment']['status'] } | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loadError.set('Token ausente');
      return;
    }
    this.loading.set(true);
    this.api.preview(token).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Não foi possível carregar o link');
      },
    });
  }

  submit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    const preview = this.preview();
    if (!token || !preview) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.api.confirm(token, preview.kind).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.result.set(result);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.submitError.set(err.message ?? 'Não foi possível processar a ação');
      },
    });
  }

  formatDate(iso: string): string {
    return formatBrDateTime(iso);
  }

  statusLabel(status: ActionPreviewDto['appointment']['status']): string {
    switch (status) {
      case 'PENDING':
        return 'Aguardando confirmação';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'COMPLETED':
        return 'Concluído';
      case 'NO_SHOW':
        return 'Não compareceu';
    }
  }
}
