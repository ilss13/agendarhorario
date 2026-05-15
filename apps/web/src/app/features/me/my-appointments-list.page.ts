import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { MyAppointmentsApi } from '@agendarhorario/web-data-access';
import type { MyAppointmentDto } from '@agendarhorario/contracts';
import { formatBrDateTime } from '@agendarhorario/utils';
import { AuthService } from '../../core/auth/auth.service';
import type { ApiError } from '../../core/http/error.interceptor';

type Range = 'upcoming' | 'past';

@Component({
  selector: 'app-my-appointments-list-page',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="wrap">
      <header class="topbar">
        <strong>Agendar Horário</strong>
        <span class="user">Olá, {{ auth.user()?.name }}</span>
        <button type="button" (click)="onLogout()">Sair</button>
      </header>

      <app-page-header
        title="Meus agendamentos"
        subtitle="Acompanhe e gerencie agendamentos em todas as empresas."
      />

      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="range() === 'upcoming'"
          [class.active]="range() === 'upcoming'"
          (click)="setRange('upcoming')"
        >
          Próximos
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="range() === 'past'"
          [class.active]="range() === 'past'"
          (click)="setRange('past')"
        >
          Histórico
        </button>
      </div>

      @if (loading() && items().length === 0) {
        <div class="loading"><app-spinner /></div>
      } @else if (loadError()) {
        <app-empty-state
          title="Não foi possível carregar"
          [description]="loadError()"
          actionLabel="Tentar novamente"
          (action)="reload()"
        />
      } @else if (items().length === 0) {
        <app-empty-state
          [title]="range() === 'upcoming' ? 'Sem agendamentos futuros' : 'Sem histórico ainda'"
          [description]="
            range() === 'upcoming'
              ? 'Quando você agendar em alguma empresa, ele aparecerá aqui.'
              : 'Você não tem agendamentos passados.'
          "
        />
      } @else {
        <ul class="list">
          @for (a of items(); track a.id) {
            <li>
              <a [routerLink]="[a.id]" class="row">
                <div>
                  <strong>{{ a.serviceName }}</strong>
                  <small>{{ a.companyName }}</small>
                  <small class="meta">
                    {{ formatDate(a.startsAt) }} ·
                    <span class="status status-{{ a.status }}">{{ statusLabel(a.status) }}</span>
                  </small>
                </div>
                <span class="arrow" aria-hidden="true">›</span>
              </a>
            </li>
          }
        </ul>
      }
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
        max-width: 760px;
        margin: 0 auto;
        padding: 1.5rem 1rem 4rem;
      }
      .topbar {
        display: flex;
        gap: 1rem;
        align-items: center;
        background: #fff;
        padding: 0.85rem 1rem;
        border-radius: 0.75rem;
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
      }
      .user {
        margin-left: auto;
        color: #6b7280;
      }
      .topbar button {
        border: 1px solid #d1d5db;
        background: #fff;
        padding: 0.4rem 0.85rem;
        border-radius: 0.5rem;
        cursor: pointer;
      }
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .tabs button {
        background: transparent;
        border: 0;
        padding: 0.55rem 1rem;
        color: #6b7280;
        cursor: pointer;
        font-weight: 600;
        border-bottom: 2px solid transparent;
      }
      .tabs button.active {
        color: #2563eb;
        border-bottom-color: #2563eb;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 3rem 0;
      }
      ul.list {
        list-style: none;
        margin: 0;
        padding: 0;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        overflow: hidden;
      }
      ul.list li {
        border-top: 1px solid #f3f4f6;
      }
      ul.list li:first-child {
        border-top: 0;
      }
      a.row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        color: inherit;
        text-decoration: none;
      }
      a.row small {
        display: block;
        color: #6b7280;
        font-size: 0.85rem;
      }
      .meta {
        margin-top: 0.25rem;
      }
      .arrow {
        color: #9ca3af;
        font-size: 1.4rem;
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
    `,
  ],
})
export class MyAppointmentsListPageComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(MyAppointmentsApi);

  readonly items = signal<MyAppointmentDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly range = signal<Range>('upcoming');

  constructor() {
    this.reload();
  }

  setRange(range: Range): void {
    if (this.range() === range) return;
    this.range.set(range);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list({ range: this.range(), page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar');
      },
    });
  }

  formatDate(iso: string): string {
    return formatBrDateTime(iso);
  }

  statusLabel(status: MyAppointmentDto['status']): string {
    switch (status) {
      case 'PENDING':
        return 'Aguardando';
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

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => (window.location.href = '/login'),
      error: () => (window.location.href = '/login'),
    });
  }
}
