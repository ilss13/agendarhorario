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
  templateUrl: './my-appointments-list.page.html',
  styleUrl: './my-appointments-list.page.scss',
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
