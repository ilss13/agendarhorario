import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ConfirmDialogComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { MyAppointmentsApi, PublicCompaniesApi } from '@agendarhorario/web-data-access';
import type { AvailabilityResponseDto, MyAppointmentDto, SlotDto } from '@agendarhorario/contracts';
import { formatBrDateTime } from '@agendarhorario/utils';
import type { ApiError } from '../../core/http/error.interceptor';

@Component({
  selector: 'app-my-appointment-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    SpinnerComponent,
    ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="wrap">
      <a class="back" routerLink="/me/agendamentos">← Voltar</a>

      @if (loading() && !appointment()) {
        <div class="loading"><app-spinner /></div>
      } @else if (loadError()) {
        <app-empty-state
          title="Não foi possível carregar"
          [description]="loadError()"
          actionLabel="Tentar novamente"
          (action)="load()"
        />
      } @else if (appointment()) {
        <app-page-header
          [title]="appointment()!.serviceName"
          [subtitle]="appointment()!.companyName"
        />

        <section class="card">
          <dl>
            <div>
              <dt>Quando</dt>
              <dd>{{ formatDate(appointment()!.startsAt) }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span class="status status-{{ appointment()!.status }}">
                  {{ statusLabel(appointment()!.status) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>Empresa</dt>
              <dd>
                <a [href]="'/p/' + appointment()!.companySlug" target="_blank">
                  {{ appointment()!.companyName }}
                </a>
              </dd>
            </div>
          </dl>

          @if (canAct(appointment()!)) {
            @if (!rescheduling()) {
              <div class="actions">
                <button type="button" class="danger" (click)="askCancel()">Cancelar</button>
                <button type="button" class="primary" (click)="startReschedule()">Remarcar</button>
              </div>
            }
          } @else {
            <p class="muted">Este agendamento já não pode ser alterado.</p>
          }
        </section>

        @if (rescheduling()) {
          <section class="card">
            <h2>Escolha um novo horário</h2>
            @if (availability()) {
              <div class="days">
                @for (day of availability()!.days; track day.date) {
                  <article class="day">
                    <header>{{ formatShortDate(day.date) }}</header>
                    @if (day.slots.length === 0) {
                      <p class="muted">Sem horários</p>
                    } @else {
                      <div class="slot-grid">
                        @for (slot of day.slots; track slot.start) {
                          <button
                            type="button"
                            (click)="selectSlot(slot)"
                            [class.selected]="selectedSlot()?.start === slot.start"
                          >
                            {{ slot.start.slice(11, 16) }}
                          </button>
                        }
                      </div>
                    }
                  </article>
                }
              </div>
            } @else {
              <div class="loading"><app-spinner /></div>
            }

            @if (actionError()) {
              <p class="error" role="alert">{{ actionError() }}</p>
            }

            <div class="actions">
              <button type="button" class="secondary" (click)="cancelReschedule()">Voltar</button>
              <button
                type="button"
                class="primary"
                [disabled]="!selectedSlot() || submitting()"
                (click)="confirmReschedule()"
              >
                {{ submitting() ? 'Salvando...' : 'Confirmar nova data' }}
              </button>
            </div>
          </section>
        }
      }

      <app-confirm-dialog
        [open]="confirmingCancel()"
        title="Cancelar agendamento"
        message="Deseja cancelar este agendamento? A empresa será notificada."
        confirmLabel="Cancelar agendamento"
        cancelLabel="Voltar"
        (confirmed)="doCancel()"
        (cancelled)="confirmingCancel.set(false)"
      />
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
        background: #f5f5f7;
      }
      .wrap {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem 1rem 4rem;
      }
      .back {
        display: inline-block;
        margin-bottom: 1rem;
        color: #2563eb;
        text-decoration: none;
      }
      .card {
        background: #fff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        display: grid;
        gap: 1rem;
        margin-bottom: 1.25rem;
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
        gap: 0.5rem;
        justify-content: flex-end;
      }
      button {
        padding: 0.65rem 1.25rem;
        border: 0;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
        color: #fff;
      }
      button.primary {
        background: #2563eb;
      }
      button.danger {
        background: #dc2626;
      }
      button.secondary {
        background: #f3f4f6;
        color: #111827;
        border: 1px solid #d1d5db;
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .status {
        font-weight: 600;
      }
      .status-PENDING {
        color: #b45309;
      }
      .status-CONFIRMED {
        color: #047857;
      }
      .status-CANCELLED {
        color: #dc2626;
      }
      .status-COMPLETED {
        color: #1d4ed8;
      }
      .status-NO_SHOW {
        color: #6b7280;
      }
      .muted {
        color: #6b7280;
      }
      .error {
        color: #dc2626;
      }
      .days {
        display: grid;
        gap: 0.75rem;
      }
      .day {
        background: #f9fafb;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
      }
      .day header {
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      .slot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 0.5rem;
      }
      .slot-grid button {
        padding: 0.45rem 0.5rem;
        border: 1px solid #d1d5db;
        background: #fff;
        border-radius: 0.5rem;
        color: #111827;
      }
      .slot-grid button.selected {
        background: #2563eb;
        border-color: #2563eb;
        color: #fff;
      }
      h2 {
        margin: 0 0 0.5rem;
        font-size: 1.05rem;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 2rem;
      }
    `,
  ],
})
export class MyAppointmentDetailPageComponent {
  private readonly api = inject(MyAppointmentsApi);
  private readonly publicApi = inject(PublicCompaniesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly appointment = signal<MyAppointmentDto | null>(null);
  readonly availability = signal<AvailabilityResponseDto | null>(null);
  readonly selectedSlot = signal<SlotDto | null>(null);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly rescheduling = signal(false);
  readonly confirmingCancel = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getById(id).subscribe({
      next: (a) => {
        this.appointment.set(a);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Não foi possível carregar');
      },
    });
  }

  canAct(a: MyAppointmentDto): boolean {
    if (a.status === 'CANCELLED' || a.status === 'COMPLETED' || a.status === 'NO_SHOW')
      return false;
    return new Date(a.startsAt).getTime() > Date.now();
  }

  startReschedule(): void {
    const a = this.appointment();
    if (!a) return;
    this.rescheduling.set(true);
    this.actionError.set(null);
    this.selectedSlot.set(null);
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const future = new Date(today);
    future.setDate(future.getDate() + 14);
    const to = future.toISOString().slice(0, 10);
    this.publicApi.availability(a.companySlug, a.serviceId, from, to).subscribe({
      next: (av) => this.availability.set(av),
      error: (err: ApiError) =>
        this.actionError.set(err.message ?? 'Não foi possível carregar horários'),
    });
  }

  cancelReschedule(): void {
    this.rescheduling.set(false);
    this.selectedSlot.set(null);
    this.actionError.set(null);
  }

  selectSlot(slot: SlotDto): void {
    this.selectedSlot.set(slot);
  }

  confirmReschedule(): void {
    const a = this.appointment();
    const slot = this.selectedSlot();
    if (!a || !slot) return;
    this.submitting.set(true);
    this.actionError.set(null);
    this.api.reschedule(a.id, { startsAt: slot.start }).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.rescheduling.set(false);
        this.selectedSlot.set(null);
        this.appointment.set(updated);
        void this.router.navigate(['/me/agendamentos', updated.id]);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.actionError.set(err.message ?? 'Não foi possível remarcar');
      },
    });
  }

  askCancel(): void {
    this.confirmingCancel.set(true);
  }

  doCancel(): void {
    const a = this.appointment();
    if (!a) return;
    this.confirmingCancel.set(false);
    this.submitting.set(true);
    this.api.cancel(a.id, {}).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.appointment.set(updated);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.actionError.set(err.message ?? 'Não foi possível cancelar');
      },
    });
  }

  formatDate(iso: string): string {
    return formatBrDateTime(iso);
  }

  formatShortDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  statusLabel(status: MyAppointmentDto['status']): string {
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
