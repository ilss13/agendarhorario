import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CompanyAppointmentsApi } from '@agendarhorario/web-data-access';
import type { CompanyAppointmentDto } from '@agendarhorario/contracts';
import { EmptyStateComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { formatDisplayPhone } from '../../public/booking/booking-display';
import type { ApiError } from '../../../core/http/error.interceptor';
import { agendaBadge, agendaClock, type AgendaBadge } from './agenda-display';
import {
  canShiftHistoryMonth,
  groupHistoryByDay,
  historyAppointmentDate,
  historyInitial,
  summarizeHistory,
} from './agenda-history';
import { currentAgendaMonth, formatAgendaMonth } from './agenda-month';
import { AgendaViewSwitcherComponent } from './agenda-view-switcher.component';

@Component({
  selector: 'app-agenda-history-page',
  standalone: true,
  imports: [AgendaViewSwitcherComponent, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-history.page.html',
  styleUrl: './agenda-history.page.scss',
})
export class AgendaHistoryPageComponent {
  private readonly api = inject(CompanyAppointmentsApi);

  readonly todayMonth = currentAgendaMonth();
  readonly month = signal(this.todayMonth);
  readonly items = signal<CompanyAppointmentDto[]>([]);
  readonly detail = signal<CompanyAppointmentDto | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly monthLabel = computed(() => formatAgendaMonth(this.month()));
  readonly groups = computed(() => groupHistoryByDay(this.items()));
  readonly summary = computed(() => summarizeHistory(this.items()));
  readonly canGoForward = computed(
    () => canShiftHistoryMonth(this.month(), 1, this.todayMonth) !== null,
  );

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
        this.detail.set(null);
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Não foi possível carregar o histórico');
      },
    });
  }

  shift(delta: number): void {
    const next = canShiftHistoryMonth(this.month(), delta, this.todayMonth);
    if (!next) return;
    this.detail.set(null);
    this.month.set(next);
    this.load();
  }

  open(item: CompanyAppointmentDto): void {
    if (!this.groups().some((group) => group.items.some((entry) => entry.id === item.id))) return;
    this.detail.set(item);
  }

  close(): void {
    this.detail.set(null);
  }

  badge(item: CompanyAppointmentDto): AgendaBadge {
    return agendaBadge(item.status);
  }

  clock(iso: string): string {
    return agendaClock(iso);
  }

  initial(name: string): string {
    return historyInitial(name);
  }

  when(item: CompanyAppointmentDto): string {
    return historyAppointmentDate(item.startsAt);
  }

  phone(value: string | null): string {
    return formatDisplayPhone(value) ?? '—';
  }
}
