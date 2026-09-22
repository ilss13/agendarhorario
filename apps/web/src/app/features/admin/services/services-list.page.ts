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
  templateUrl: './services-list.page.html',
  styleUrl: './services-list.page.scss',
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
    void this.router.navigate(['/dashboard/servicos/novo']);
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
