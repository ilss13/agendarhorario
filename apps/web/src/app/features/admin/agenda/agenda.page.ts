import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyAppointmentsApi } from '@agendarhorario/web-data-access';
import type { CompanyAppointmentDto } from '@agendarhorario/contracts';
import { EmptyStateComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import type { ApiError } from '../../../core/http/error.interceptor';
import { todayInAgenda } from './agenda-display';
import {
  agendaDayLabel,
  buildAgendaMonthGrid,
  currentAgendaMonth,
  formatAgendaMonth,
  openAppointmentCounts,
  shiftAgendaMonth,
  summarizeAgendaMonth,
  type AgendaMonthCell,
} from './agenda-month';
import { AgendaViewSwitcherComponent } from './agenda-view-switcher.component';

const WEEKDAYS = [
  { long: 'Seg', short: 'S' },
  { long: 'Ter', short: 'T' },
  { long: 'Qua', short: 'Q' },
  { long: 'Qui', short: 'Q' },
  { long: 'Sex', short: 'S' },
  { long: 'Sáb', short: 'S' },
  { long: 'Dom', short: 'D' },
] as const;

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [AgendaViewSwitcherComponent, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda.page.html',
  styleUrl: './agenda.page.scss',
})
export class AgendaPageComponent {
  private readonly api = inject(CompanyAppointmentsApi);
  private readonly router = inject(Router);

  readonly weekdays = WEEKDAYS;
  readonly month = signal(currentAgendaMonth());
  readonly items = signal<CompanyAppointmentDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly monthLabel = computed(() => formatAgendaMonth(this.month()));
  readonly cells = computed(() => buildAgendaMonthGrid(this.month(), todayInAgenda()));
  readonly counts = computed(() => openAppointmentCounts(this.items()));
  readonly summary = computed(() => summarizeAgendaMonth(this.items()));

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listMonth(this.month()).subscribe({
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

  shift(delta: number): void {
    const next = shiftAgendaMonth(this.month(), delta);
    if (!next) return;
    this.month.set(next);
    this.load();
  }

  count(iso: string): number {
    return this.counts()[iso] ?? 0;
  }

  dayLabel(cell: AgendaMonthCell): string {
    return agendaDayLabel(cell, this.count(cell.iso));
  }

  openDay(iso: string): void {
    void this.router.navigate(['/dashboard/agenda', iso]);
  }
}
