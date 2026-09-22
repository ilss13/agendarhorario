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
  templateUrl: './my-appointment-detail.page.html',
  styleUrl: './my-appointment-detail.page.scss',
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
