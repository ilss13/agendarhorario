import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ConfirmDialogComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  SearchInputComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { ServicesApi } from '@agendarhorario/web-data-access';
import type { ServiceDto } from '@agendarhorario/contracts';
import type { ApiError } from '../../../core/http/error.interceptor';

@Component({
  selector: 'app-services-list-page',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    SpinnerComponent,
    ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Serviços" subtitle="Tipos de atendimento oferecidos pela sua empresa.">
      <a slot="actions" routerLink="novo" class="btn-primary">+ Novo serviço</a>
    </app-page-header>

    <div class="toolbar">
      <app-search-input
        placeholder="Buscar por nome..."
        label="Buscar serviços"
        (valueChange)="onSearch($event)"
      />
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
    } @else if (items().length === 0 && query()) {
      <app-empty-state
        title="Nenhum resultado"
        [description]="'Nenhum serviço para “' + query() + '”.'"
        actionLabel="Limpar busca"
        (action)="clearSearch()"
      />
    } @else if (items().length === 0) {
      <app-empty-state
        title="Você ainda não tem serviços"
        description="Cadastre seu primeiro serviço para começar a receber agendamentos."
        actionLabel="Cadastrar serviço"
        (action)="goNew()"
      />
    } @else {
      <ul class="list">
        @for (item of items(); track item.id) {
          <li>
            <a [routerLink]="[item.id]" class="row">
              <div>
                <strong>{{ item.name }}</strong>
                <small>
                  {{ item.durationMinutes }} min · R$ {{ item.price.toFixed(2) }} ·
                  {{ item.active ? 'Ativo' : 'Inativo' }}
                </small>
              </div>
              <span class="arrow" aria-hidden="true">›</span>
            </a>
            <button
              type="button"
              class="delete"
              (click)="askRemove(item)"
              [attr.aria-label]="'Remover ' + item.name"
            >
              Remover
            </button>
          </li>
        }
      </ul>
    }

    <app-confirm-dialog
      [open]="!!toRemove()"
      title="Remover serviço"
      [message]="
        'Deseja remover “' +
        (toRemove()?.name ?? '') +
        '”? Esta ação pode ser desfeita por um administrador.'
      "
      confirmLabel="Remover"
      (confirmed)="confirmRemove()"
      (cancelled)="toRemove.set(null)"
    />
  `,
  styles: [
    `
      .toolbar {
        margin-bottom: 1rem;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 3rem 1rem;
      }
      .btn-primary {
        padding: 0.55rem 1rem;
        background: #2563eb;
        color: #fff;
        text-decoration: none;
        border-radius: 0.5rem;
        font-weight: 600;
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
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 0.5rem;
        border-top: 1px solid #f3f4f6;
        padding: 0.25rem 1rem;
      }
      ul.list li:first-child {
        border-top: 0;
      }
      a.row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.85rem 0;
        color: inherit;
        text-decoration: none;
      }
      a.row small {
        color: #6b7280;
        display: block;
      }
      .arrow {
        color: #9ca3af;
        font-size: 1.4rem;
      }
      .delete {
        border: 0;
        background: transparent;
        color: #dc2626;
        cursor: pointer;
        padding: 0.3rem 0.5rem;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class ServicesListPageComponent {
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);

  readonly items = signal<ServiceDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly query = signal<string>('');
  readonly toRemove = signal<ServiceDto | null>(null);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list({ page: 1, pageSize: 50, q: this.query() || undefined }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar serviços');
      },
    });
  }

  onSearch(q: string): void {
    this.query.set(q.trim());
    this.reload();
  }

  clearSearch(): void {
    this.query.set('');
    this.reload();
  }

  goNew(): void {
    void this.router.navigate(['/admin/servicos/novo']);
  }

  askRemove(item: ServiceDto): void {
    this.toRemove.set(item);
  }

  confirmRemove(): void {
    const target = this.toRemove();
    if (!target) return;
    this.toRemove.set(null);
    const optimistic = this.items().filter((s) => s.id !== target.id);
    this.items.set(optimistic);
    this.api.remove(target.id).subscribe({
      error: () => this.reload(),
    });
  }
}
