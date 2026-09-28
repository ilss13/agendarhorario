import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionTokenApi } from '@agendarhorario/web-data-access';
import type { ActionKind, ActionPreviewDto, AppointmentStatus } from '@agendarhorario/contracts';
import { EmptyStateComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { nowInAppTz } from '@agendarhorario/utils';
import { companyInitials, formatDisplayPhone, formatServicePrice } from './booking/booking-display';
import type { ApiError } from '../../core/http/error.interceptor';
import {
  buildAppointmentIcs,
  confirmationDateLabel,
  confirmationIntro,
  confirmationPhase,
  confirmationTimeLabel,
  linkExpiryCopy,
  type ConfirmationPhase,
} from './confirmation-display';

@Component({
  selector: 'app-action-confirm-page',
  standalone: true,
  imports: [EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './action-confirm.page.html',
  styleUrl: './action-confirm.page.scss',
})
export class ActionConfirmPageComponent {
  private readonly api = inject(ActionTokenApi);
  private readonly route = inject(ActivatedRoute);

  readonly preview = signal<ActionPreviewDto | null>(null);
  readonly resultStatus = signal<AppointmentStatus | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly logoFailed = signal(false);

  readonly phase = computed((): ConfirmationPhase | null => {
    const preview = this.preview();
    if (!preview) return null;
    return confirmationPhase({
      kind: preview.kind,
      alreadyConsumed: preview.alreadyConsumed,
      status: preview.appointment.status,
      resultStatus: this.resultStatus(),
    });
  });

  readonly intro = computed(() => {
    const appointment = this.preview()?.appointment;
    if (!appointment) return '';
    return confirmationIntro(appointment.customerName, appointment.companyName);
  });

  readonly dateLabel = computed(() => {
    const appointment = this.preview()?.appointment;
    return appointment ? confirmationDateLabel(appointment.startsAt) : '';
  });

  readonly timeLabel = computed(() => {
    const appointment = this.preview()?.appointment;
    return appointment
      ? confirmationTimeLabel(appointment.startsAt, appointment.durationMinutes)
      : '';
  });

  readonly priceLabel = computed(() => {
    const appointment = this.preview()?.appointment;
    return appointment ? formatServicePrice(appointment.price) : '';
  });

  readonly expiryLabel = computed(() => {
    const preview = this.preview();
    return preview ? linkExpiryCopy(preview.expiresAt, nowInAppTz()) : '';
  });

  readonly initials = computed(() =>
    companyInitials(this.preview()?.appointment.companyName ?? ''),
  );

  readonly phoneLabel = computed(() =>
    formatDisplayPhone(this.preview()?.appointment.companyPhone),
  );

  constructor() {
    this.load();
  }

  load(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loadError.set('Token ausente');
      return;
    }
    this.loading.set(true);
    this.api.preview(token).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Não foi possível carregar o link');
      },
    });
  }

  submit(kind: ActionKind): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token || !this.preview()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.api.confirm(token, kind).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.resultStatus.set(result.status);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.submitError.set(err.message ?? 'Não foi possível processar a ação');
      },
    });
  }

  downloadCalendar(): void {
    const appointment = this.preview()?.appointment;
    if (!appointment) return;
    const ics = buildAppointmentIcs({
      uid: appointment.id,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      summary: `${appointment.serviceName} — ${appointment.companyName}`,
    });
    if (!ics) return;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'agendamento.ics';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
