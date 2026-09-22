import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  EmptyStateComponent,
  FormFieldComponent,
  PageHeaderComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
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

type Step = 'slot' | 'data' | 'otp' | 'done';

const RESEND_COOLDOWN_SECONDS = 60;
const BR_MOBILE_MASK = /^\(\d{2}\) \d{5}-\d{4}$/;

const brMobileDigits = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

const maskBrMobile = (value: string): string => {
  const digits = brMobileDigits(value);
  const ddd = digits.slice(0, 2);
  const prefix = digits.slice(2, 7);
  const suffix = digits.slice(7, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 7) return `(${ddd}) ${prefix}`;
  return `(${ddd}) ${prefix}-${suffix}`;
};

const toE164Br = (value: string): string => `+55${brMobileDigits(value)}`;

@Component({
  selector: 'app-booking-flow-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormFieldComponent,
    EmptyStateComponent,
    SpinnerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-flow.page.html',
  styleUrl: './booking-flow.page.scss',
})
export class BookingFlowPageComponent {
  private readonly api = inject(PublicCompaniesApi);
  private readonly verificationApi = inject(PublicVerificationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  readonly slug = signal<string>(this.route.snapshot.paramMap.get('slug') ?? '');
  readonly serviceId = signal<string>(this.route.snapshot.paramMap.get('serviceId') ?? '');
  readonly company = signal<PublicCompanyDto | null>(null);
  readonly availability = signal<AvailabilityResponseDto | null>(null);
  readonly selectedSlot = signal<SlotDto | null>(null);
  readonly verificationToken = signal<string | null>(null);
  readonly verificationTarget = signal<string | null>(null);
  readonly verificationChannel = signal<VerificationChannel>('EMAIL');

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

  readonly stepTitle = computed(() => {
    switch (this.step()) {
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

  private fetchAvailability(): void {
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const future = new Date(today);
    future.setDate(future.getDate() + 14);
    const to = future.toISOString().slice(0, 10);
    this.api.availability(this.slug(), this.serviceId(), from, to).subscribe({
      next: (a) => {
        this.availability.set(a);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar disponibilidade');
        trackBooking('availability_failed', { status: err.status });
      },
    });
  }

  selectSlot(slot: SlotDto): void {
    this.selectedSlot.set(slot);
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
