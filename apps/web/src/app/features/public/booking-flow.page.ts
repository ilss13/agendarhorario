import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmptyStateComponent, FormFieldComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { PublicCompaniesApi, PublicVerificationApi } from '@agendarhorario/web-data-access';
import {
  AvailabilityResponseDto,
  PublicCompanyDto,
  PublicServiceDto,
  SlotDto,
  VerificationChannel,
} from '@agendarhorario/contracts';
import { formatBrDateTime } from '@agendarhorario/utils';
import { firstError } from '../../core/forms/form-error';
import type { ApiError } from '../../core/http/error.interceptor';
import { trackBooking } from '../../core/observability/booking-breadcrumb';
import { BookingIdentityComponent } from './booking/booking-identity.component';
import { BookingOtpInputComponent } from './booking/booking-otp-input.component';
import { BookingServicePickerComponent } from './booking/booking-service-picker.component';
import { BookingSlotPickerComponent } from './booking/booking-slot-picker.component';
import { BookingStepComponent } from './booking/booking-step.component';
import {
  type BookingAccordionStep,
  BR_MOBILE_MASK,
  localDate,
  maskBrMobile,
  serviceStepSummary,
  slotStepSummary,
  stepCounterLabel,
  summarizeBusinessHours,
  toE164Br,
} from './booking/booking-display';

type Step = BookingAccordionStep | 'done';

const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'app-booking-flow-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldComponent,
    EmptyStateComponent,
    SpinnerComponent,
    BookingIdentityComponent,
    BookingStepComponent,
    BookingServicePickerComponent,
    BookingSlotPickerComponent,
    BookingOtpInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-flow.page.html',
  styleUrl: './booking-flow.page.scss',
})
export class BookingFlowPageComponent {
  private readonly api = inject(PublicCompaniesApi);
  private readonly verificationApi = inject(PublicVerificationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  readonly slug = signal<string>(this.route.snapshot.paramMap.get('slug') ?? '');
  readonly serviceId = signal<string>(this.route.snapshot.paramMap.get('serviceId') ?? '');
  readonly company = signal<PublicCompanyDto | null>(null);
  readonly availability = signal<AvailabilityResponseDto | null>(null);
  readonly selectedDate = signal<string | null>(null);
  readonly selectedSlot = signal<SlotDto | null>(null);
  readonly verificationToken = signal<string | null>(null);
  readonly verificationTarget = signal<string | null>(null);
  readonly verificationChannel = signal<VerificationChannel>('EMAIL');
  readonly otpReady = signal(false);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly sending = signal(false);
  readonly confirming = signal(false);
  readonly otpError = signal<string | null>(null);
  readonly step = signal<Step>('slot');
  readonly resendCooldownSeconds = signal(0);
  readonly resendLabel = computed(() => {
    if (this.sending()) {
      return 'Reenviando...';
    }
    const seconds = this.resendCooldownSeconds();
    return seconds > 0 ? `Reenviar código (${seconds}s)` : 'Reenviar código';
  });

  readonly service = computed<PublicServiceDto | null>(() => {
    const c = this.company();
    if (!c) return null;
    return c.services.find((s) => s.id === this.serviceId()) ?? null;
  });

  readonly hoursLabel = computed(() => summarizeBusinessHours(this.company()?.businessHours ?? []));
  readonly openDays = computed(
    () => this.availability()?.days.filter((day) => day.slots.length > 0) ?? [],
  );
  readonly counterLabel = computed(() => {
    const step = this.step();
    return step === 'done' ? 'Agendamento solicitado' : stepCounterLabel(step);
  });
  readonly serviceSummary = computed(() =>
    serviceStepSummary(this.service(), this.step() === 'service'),
  );
  readonly scheduleSummary = computed(() => {
    const slot = this.selectedSlot();
    return slotStepSummary(
      slot ? localDate(slot.start) : null,
      slot?.start ?? null,
      this.step() === 'slot' || !slot,
    );
  });
  readonly confirmedSummary = computed(() => {
    const slot = this.selectedSlot();
    if (!slot) return '';
    return slotStepSummary(localDate(slot.start), slot.start, false);
  });
  readonly otpHint = computed(() => {
    const via = this.verificationChannel() === 'SMS' ? 'SMS' : 'e-mail';
    const target = this.verificationTarget();
    return target
      ? `Enviamos um código de 6 dígitos por ${via} para ${target}.`
      : 'Enviamos um código de 6 dígitos.';
  });

  readonly stepTitle = computed(() => {
    switch (this.step()) {
      case 'service':
        return 'Escolha um serviço';
      case 'slot':
        return 'Escolha um horário';
      case 'data':
        return 'Seus dados';
      case 'otp':
        return 'Confirme com o código';
      default:
        return '';
    }
  });

  readonly confirmedDateLabel = computed(() => {
    const slot = this.selectedSlot();
    return slot ? formatBrDateTime(slot.start) : '';
  });

  readonly contactForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(BR_MOBILE_MASK)]],
    notes: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
  });

  readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => this.clearResendTimer());
  }

  load(): void {
    if (!this.slug() || !this.serviceId()) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getBySlug(this.slug()).subscribe({
      next: (c) => {
        this.company.set(c);
        this.fetchAvailability();
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar');
        trackBooking('page_load_failed', { status: err.status });
      },
    });
  }

  chooseService(id: string): void {
    if (this.company()?.status !== 'AVAILABLE') return;
    if (id === this.serviceId()) {
      this.step.set('slot');
      return;
    }
    this.serviceId.set(id);
    this.selectedSlot.set(null);
    this.selectedDate.set(null);
    this.availability.set(null);
    this.otpReady.set(false);
    this.step.set('slot');
    void this.router.navigate(['/p', this.slug(), 'agendar', id], { replaceUrl: true });
    this.fetchAvailability();
    trackBooking('service_selected');
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    const slot = this.selectedSlot();
    if (slot && localDate(slot.start) !== date) {
      this.selectedSlot.set(null);
    }
  }

  openStep(next: BookingAccordionStep): void {
    if (next === 'slot' && !this.service()) return;
    if (next === 'data' && !this.selectedSlot()) return;
    if (next === 'otp' && !this.otpReady()) return;
    this.step.set(next);
  }

  contactSummary(): string {
    const name = this.contactForm.controls.name.value.trim();
    const step = this.step();
    if (!name || step === 'service' || step === 'slot' || step === 'data') {
      return 'Nome, telefone e e-mail';
    }
    return name;
  }

  private fetchAvailability(): void {
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const future = new Date(today);
    future.setDate(future.getDate() + 14);
    const to = future.toISOString().slice(0, 10);
    this.loading.set(true);
    this.loadError.set(null);
    this.api.availability(this.slug(), this.serviceId(), from, to).subscribe({
      next: (a) => {
        this.availability.set(a);
        this.syncSelectedDate();
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar disponibilidade');
        trackBooking('availability_failed', { status: err.status });
      },
    });
  }

  private syncSelectedDate(): void {
    const open = this.openDays();
    const current = this.selectedDate();
    if (current && open.some((day) => day.date === current)) return;
    this.selectedDate.set(open[0]?.date ?? null);
  }

  selectSlot(slot: SlotDto): void {
    this.selectedSlot.set(slot);
    const date = localDate(slot.start);
    if (date) this.selectedDate.set(date);
    trackBooking('slot_selected');
  }

  allDaysEmpty(a: AvailabilityResponseDto): boolean {
    return a.days.every((d) => d.slots.length === 0);
  }

  formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  goToData(): void {
    if (!this.selectedSlot()) return;
    this.otpError.set(null);
    this.step.set('data');
  }

  cf(name: 'name' | 'email' | 'phone' | 'notes'): string | null {
    if (name === 'phone') {
      const control = this.contactForm.controls.phone;
      if (control.errors?.['pattern'] && (control.touched || control.dirty)) {
        return 'Use o formato (11) 99999-9999';
      }
    }
    return firstError(this.contactForm.controls[name]);
  }

  otpFieldError(): string | null {
    return firstError(this.otpForm.controls.code);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = maskBrMobile(input.value);
    this.contactForm.controls.phone.setValue(masked);
    input.value = masked;
  }

  onOtpCode(code: string): void {
    this.otpForm.controls.code.setValue(code);
    if (/^\d{6}$/.test(code)) {
      this.otpForm.controls.code.markAsDirty();
    }
  }

  onRequestOtp(): void {
    if (this.resendCooldownSeconds() > 0 || this.sending()) {
      return;
    }
    this.requestOtp({ stayOnOtp: false });
  }

  onResendOtp(): void {
    if (this.resendCooldownSeconds() > 0 || this.sending() || this.confirming()) {
      return;
    }
    this.requestOtp({ stayOnOtp: true });
  }

  onConfirmOtp(): void {
    this.otpError.set(null);
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    const slot = this.selectedSlot();
    const existingToken = this.verificationToken();
    if (!slot) return;

    this.confirming.set(true);
    if (existingToken) {
      this.submitAppointment(existingToken);
      return;
    }

    const channel = this.verificationChannel();
    const target = this.verificationTarget();
    if (!target) {
      this.confirming.set(false);
      return;
    }

    this.verificationApi
      .confirm({ channel, target, code: this.otpForm.controls.code.value })
      .subscribe({
        next: (response) => {
          this.verificationToken.set(response.verificationToken);
          this.submitAppointment(response.verificationToken);
        },
        error: (err: ApiError) => {
          this.confirming.set(false);
          this.otpError.set(this.describeError(err, 'Código inválido'));
          trackBooking('otp_confirm_failed', { status: err.status });
        },
      });
  }

  private requestOtp(options: { stayOnOtp: boolean }): void {
    this.otpError.set(null);
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.step.set('data');
      return;
    }
    const value = this.contactForm.getRawValue();
    this.sending.set(true);
    this.verificationApi
      .request({
        email: value.email,
        phone: toE164Br(value.phone),
      })
      .subscribe({
        next: (response) => {
          this.sending.set(false);
          this.verificationToken.set(null);
          this.verificationChannel.set(response.channel);
          this.verificationTarget.set(response.target);
          this.otpReady.set(true);
          this.otpForm.reset({ code: '' });
          this.step.set('otp');
          this.startResendCooldown();
          trackBooking('otp_requested', { channel: response.channel });
          if (options.stayOnOtp) {
            this.otpError.set(null);
          }
        },
        error: (err: ApiError) => {
          this.sending.set(false);
          this.otpError.set(this.describeError(err, 'Erro ao enviar código'));
          trackBooking('otp_request_failed', { status: err.status });
        },
      });
  }

  private submitAppointment(token: string): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    const value = this.contactForm.getRawValue();
    this.api
      .createAppointment(this.slug(), {
        serviceId: this.serviceId(),
        startsAt: slot.start,
        customer: {
          name: value.name,
          email: value.email,
          phone: toE164Br(value.phone),
          notes: value.notes ?? null,
        },
        verificationToken: token,
      })
      .subscribe({
        next: () => {
          this.confirming.set(false);
          this.step.set('done');
          trackBooking('created');
        },
        error: (err: ApiError) => {
          this.confirming.set(false);
          this.otpError.set(this.describeError(err, 'Erro ao concluir agendamento'));
          trackBooking('failed', { status: err.status });
        },
      });
  }

  private startResendCooldown(): void {
    this.clearResendTimer();
    this.resendCooldownSeconds.set(RESEND_COOLDOWN_SECONDS);
    this.resendTimer = setInterval(() => {
      const remaining = this.resendCooldownSeconds() - 1;
      if (remaining <= 0) {
        this.resendCooldownSeconds.set(0);
        this.clearResendTimer();
        return;
      }
      this.resendCooldownSeconds.set(remaining);
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  private describeError(err: ApiError, fallback: string): string {
    const message = err.message ?? '';
    if (err.status >= 500 || /internal server error/i.test(message)) {
      return 'Não foi possível concluir. Tente novamente ou reenvie o código.';
    }
    return message || fallback;
  }
}
