import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import type {
  BusinessExceptionDto,
  BusinessHourDto,
  CompanyAppointmentDto,
} from '@agendarhorario/contracts';
import {
  BusinessExceptionsApi,
  BusinessHoursApi,
  CompanyAppointmentsApi,
} from '@agendarhorario/web-data-access';
import { EmptyStateComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { formatDisplayPhone } from '../../public/booking/booking-display';
import type { ApiError } from '../../../core/http/error.interceptor';
import { agendaBadge, agendaClock, todayInAgenda, type AgendaBadge } from './agenda-display';
import {
  agendaDayEmptyMessage,
  agendaWeekChip,
  agendaWeekContaining,
  agendaWeekMonths,
  appointmentsOnDay,
  formatAgendaDay,
  isAgendaDayOpen,
  summarizeAgendaToday,
} from './agenda-week';
import { AgendaViewSwitcherComponent } from './agenda-view-switcher.component';

@Component({
  selector: 'app-agenda-week-page',
  standalone: true,
  imports: [AgendaViewSwitcherComponent, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-week.page.html',
  styleUrl: './agenda-week.page.scss',
})
export class AgendaWeekPageComponent {
  private readonly api = inject(CompanyAppointmentsApi);
  private readonly hoursApi = inject(BusinessHoursApi);
  private readonly exceptionsApi = inject(BusinessExceptionsApi);

  readonly today = todayInAgenda();
  readonly selected = signal(this.today);
  readonly items = signal<CompanyAppointmentDto[]>([]);
  readonly hours = signal<BusinessHourDto[] | null>(null);
  readonly exceptions = signal<BusinessExceptionDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly days = computed(() =>
    agendaWeekContaining(this.today).flatMap((iso) => {
      const chip = agendaWeekChip(iso);
      if (!chip) return [];
      const hours = this.hours();
      return [
        {
          iso,
          label: chip.label,
          day: chip.day,
          open: hours ? isAgendaDayOpen(iso, hours, this.exceptions()) : true,
        },
      ];
    }),
  );
  readonly dayLabel = computed(() => formatAgendaDay(this.selected()));
  readonly selectedItems = computed(() => appointmentsOnDay(this.items(), this.selected()));
  readonly stats = computed(() => summarizeAgendaToday(this.items(), this.today));
  readonly emptyMessage = computed(() => {
    const day = this.days().find((entry) => entry.iso === this.selected());
    return agendaDayEmptyMessage(this.selected(), this.today, day?.open ?? true);
  });

  constructor() {
    this.load();
  }

  load(): void {
    const days = agendaWeekContaining(this.today);
    const months = agendaWeekMonths(days);
    if (months.length === 0) {
      this.loadError.set('Não foi possível carregar a agenda');
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      months: forkJoin(months.map((month) => this.api.listMonth(month))),
      hours: this.hoursApi.list().pipe(catchError(() => of(null))),
      exceptions: this.exceptionsApi
        .list({ from: days[0], to: days[days.length - 1] })
        .pipe(catchError(() => of([] as BusinessExceptionDto[]))),
    }).subscribe({
      next: (result) => {
        this.items.set(result.months.flatMap((month) => month.items));
        this.hours.set(result.hours);
        this.exceptions.set(result.exceptions);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.items.set([]);
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Não foi possível carregar a agenda');
      },
    });
  }

  select(iso: string): void {
    if (!this.days().some((day) => day.iso === iso)) return;
    this.selected.set(iso);
  }

  dayLabelFor(day: { label: string; day: number; iso: string; open: boolean }): string {
    const parts = [`${day.label} ${day.day}`];
    if (day.iso === this.today) parts.push('hoje');
    if (!day.open) parts.push('fechado');
    return parts.join(', ');
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
