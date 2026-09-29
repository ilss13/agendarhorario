import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CompanyAppointmentsApi } from '@agendarhorario/web-data-access';
import type { CompanyAppointmentDto } from '@agendarhorario/contracts';
import { EmptyStateComponent, PageHeaderComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { formatDisplayPhone } from '../../public/booking/booking-display';
import type { ApiError } from '../../../core/http/error.interceptor';
import { agendaBadge, agendaClock, todayInAgenda, type AgendaBadge } from './agenda-display';

@Component({
  selector: 'app-agenda-day-page',
  standalone: true,
  imports: [EmptyStateComponent, PageHeaderComponent, RouterLink, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-day.page.html',
  styleUrl: './agenda-day.page.scss',
})
export class AgendaDayPageComponent {
  private readonly api = inject(CompanyAppointmentsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly date = signal(todayInAgenda());
  readonly items = signal<CompanyAppointmentDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  constructor() {
    const fromRoute = this.route.snapshot.paramMap.get('date');
    if (fromRoute && !/^\d{4}-\d{2}-\d{2}$/.test(fromRoute)) {
      this.loadError.set('Data inválida');
      return;
    }
    if (fromRoute) this.date.set(fromRoute);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list(this.date()).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.items.set([]);
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Não foi possível carregar a agenda');
      },
    });
  }

  onDateInput(event: Event): void {
    const value = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.onDate(value);
  }

  onDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const changed = value !== this.date();
    this.date.set(value);
    this.load();
    if (changed) {
      void this.router.navigate(['/dashboard/agenda', value], { replaceUrl: true });
    }
  }

  badge(item: CompanyAppointmentDto): AgendaBadge {
    return agendaBadge(item.status);
  }

  clock(iso: string): string {
    return agendaClock(iso);
  }

  phone(value: string | null): string | null {
    return formatDisplayPhone(value);
  }
}
