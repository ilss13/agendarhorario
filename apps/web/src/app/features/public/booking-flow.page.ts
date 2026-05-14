import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
} from '@agendarhorario/contracts';
import { formatBrDateTime } from '@agendarhorario/utils';
import { firstError } from '../../core/forms/form-error';
import type { ApiError } from '../../core/http/error.interceptor';

type Step = 'slot' | 'data' | 'otp' | 'done';

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
  template: `
    <main class="wrap">
      <a class="back" [routerLink]="['/p', slug()]">← Voltar para a empresa</a>

      @if (loading() && !company()) {
        <div class="loading"><app-spinner /></div>
      } @else if (loadError() || !service()) {
        <app-empty-state
          title="Não foi possível carregar"
          [description]="loadError() || 'Serviço indisponível'"
          actionLabel="Tentar novamente"
          (action)="load()"
        />
      } @else if (step() === 'done') {
        <section class="done">
          <h1>Agendamento solicitado!</h1>
          <p class="muted">
            Recebemos seu pedido para <strong>{{ service()?.name }}</strong> em
            <strong>{{ confirmedDateLabel() }}</strong
            >.
          </p>
          <p class="muted">
            Em breve a empresa irá confirmar. Você também receberá uma notificação para confirmar ou
            cancelar a presença.
          </p>
          <a class="btn-primary" [routerLink]="['/p', slug()]">Voltar para a empresa</a>
        </section>
      } @else {
        <app-page-header
          [title]="stepTitle()"
          [subtitle]="company()?.name + ' · ' + service()?.name"
        />

        <ol class="steps" [attr.data-step]="step()">
          <li [attr.data-active]="step() === 'slot'">1. Horário</li>
          <li [attr.data-active]="step() === 'data'">2. Dados</li>
          <li [attr.data-active]="step() === 'otp'">3. Confirmar</li>
        </ol>

        @if (step() === 'slot') {
          @if (availability(); as a) {
            @if (a.days.length === 0 || allDaysEmpty(a)) {
              <app-empty-state
                title="Sem horários disponíveis"
                description="Não há slots disponíveis nos próximos dias. Tente outra data."
              />
            }
            <div class="days">
              @for (day of a.days; track day.date) {
                <article class="day">
                  <header>{{ formatDate(day.date) }}</header>
                  @if (day.slots.length === 0) {
                    <p class="muted">Sem horários</p>
                  } @else {
                    <div class="slot-grid">
                      @for (slot of day.slots; track slot.start) {
                        <button
                          type="button"
                          (click)="selectSlot(slot)"
                          [class.selected]="selectedSlot()?.start === slot.start"
                        >
                          {{ slot.start.slice(11, 16) }}
                        </button>
                      }
                    </div>
                  }
                </article>
              }
            </div>
          } @else {
            <div class="loading"><app-spinner /></div>
          }

          <div class="actions">
            <button
              type="button"
              class="btn-primary"
              (click)="goToData()"
              [disabled]="!selectedSlot()"
            >
              Continuar
            </button>
          </div>
        } @else if (step() === 'data') {
          <form [formGroup]="contactForm" (ngSubmit)="onRequestOtp()" novalidate>
            <app-form-field label="Seu nome" [required]="true" [errorMessage]="cf('name')">
              <input type="text" formControlName="name" maxlength="120" />
            </app-form-field>

            <app-form-field label="Como prefere receber o código?" [required]="true">
              <select formControlName="channel">
                <option value="EMAIL">E-mail</option>
                <option value="SMS">SMS</option>
              </select>
            </app-form-field>

            @if (contactForm.controls.channel.value === 'EMAIL') {
              <app-form-field label="E-mail" [required]="true" [errorMessage]="cf('email')">
                <input type="email" formControlName="email" autocomplete="email" />
              </app-form-field>
            } @else {
              <app-form-field
                label="Telefone (com DDI, ex.: +5511999999999)"
                [required]="true"
                [errorMessage]="cf('phone')"
              >
                <input type="tel" formControlName="phone" />
              </app-form-field>
            }

            <app-form-field label="Observações (opcional)" [errorMessage]="cf('notes')">
              <textarea formControlName="notes" rows="3" maxlength="500"></textarea>
            </app-form-field>

            @if (otpError()) {
              <p class="error" role="alert">{{ otpError() }}</p>
            }

            <div class="actions">
              <button type="button" class="btn-secondary" (click)="step.set('slot')">Voltar</button>
              <button
                type="submit"
                class="btn-primary"
                [disabled]="contactForm.invalid || sending()"
              >
                {{ sending() ? 'Enviando...' : 'Enviar código' }}
              </button>
            </div>
          </form>
        } @else if (step() === 'otp') {
          <form [formGroup]="otpForm" (ngSubmit)="onConfirmOtp()" novalidate>
            <p class="muted">
              Enviamos um código de 6 dígitos para
              <strong>{{ verificationTarget() }}</strong
              >.
            </p>
            <app-form-field label="Código" [required]="true" [errorMessage]="otpFieldError()">
              <input
                type="text"
                inputmode="numeric"
                pattern="\\d{6}"
                maxlength="6"
                formControlName="code"
                autocomplete="one-time-code"
              />
            </app-form-field>

            @if (otpError()) {
              <p class="error" role="alert">{{ otpError() }}</p>
            }

            <div class="actions">
              <button type="button" class="btn-secondary" (click)="step.set('data')">Voltar</button>
              <button
                type="submit"
                class="btn-primary"
                [disabled]="otpForm.invalid || confirming()"
              >
                {{ confirming() ? 'Confirmando...' : 'Confirmar agendamento' }}
              </button>
            </div>
          </form>
        }
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #f5f5f7;
        min-height: 100dvh;
      }
      .wrap {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem 1rem 4rem;
      }
      .back {
        display: inline-block;
        margin-bottom: 1rem;
        color: #2563eb;
        text-decoration: none;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 4rem 0;
      }
      .steps {
        display: flex;
        gap: 0.5rem;
        list-style: none;
        padding: 0;
        margin: 0 0 1.5rem;
        font-size: 0.9rem;
        color: #6b7280;
        flex-wrap: wrap;
      }
      .steps li[data-active='true'] {
        color: #2563eb;
        font-weight: 600;
      }
      .days {
        display: grid;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .day {
        background: #fff;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        border: 1px solid #e5e7eb;
      }
      .day header {
        font-weight: 600;
        margin-bottom: 0.75rem;
      }
      .slot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 0.5rem;
      }
      .slot-grid button {
        padding: 0.55rem 0.5rem;
        border: 1px solid #d1d5db;
        background: #fff;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
      }
      .slot-grid button.selected {
        background: #2563eb;
        color: #fff;
        border-color: #2563eb;
      }
      form {
        display: grid;
        gap: 1rem;
        background: #fff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
      }
      textarea {
        width: 100%;
        padding: 0.55rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-family: inherit;
        font-size: 0.95rem;
        resize: vertical;
      }
      select {
        padding: 0.55rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.95rem;
        background: #fff;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      .btn-primary {
        padding: 0.65rem 1.25rem;
        border: 0;
        border-radius: 0.5rem;
        background: #2563eb;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
      }
      .btn-primary:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .btn-secondary {
        padding: 0.65rem 1.25rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      .error {
        color: #dc2626;
      }
      .muted {
        color: #6b7280;
      }
      .done {
        background: #fff;
        padding: 2rem;
        border-radius: 0.75rem;
        text-align: center;
      }
      .done h1 {
        margin: 0 0 0.75rem;
      }
    `,
  ],
})
export class BookingFlowPageComponent {
  private readonly api = inject(PublicCompaniesApi);
  private readonly verificationApi = inject(PublicVerificationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly slug = signal<string>(this.route.snapshot.paramMap.get('slug') ?? '');
  readonly serviceId = signal<string>(this.route.snapshot.paramMap.get('serviceId') ?? '');
  readonly company = signal<PublicCompanyDto | null>(null);
  readonly availability = signal<AvailabilityResponseDto | null>(null);
  readonly selectedSlot = signal<SlotDto | null>(null);
  readonly verificationToken = signal<string | null>(null);
  readonly verificationTarget = signal<string | null>(null);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly sending = signal(false);
  readonly confirming = signal(false);
  readonly otpError = signal<string | null>(null);
  readonly step = signal<Step>('slot');

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
    channel: ['EMAIL' as 'EMAIL' | 'SMS'],
    email: ['', [Validators.email]],
    phone: [''],
    notes: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
  });

  readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    this.contactForm.controls.channel.valueChanges.subscribe(() => {
      this.adjustValidators();
    });
    this.adjustValidators();
    this.load();
  }

  private adjustValidators(): void {
    const channel = this.contactForm.controls.channel.value;
    if (channel === 'EMAIL') {
      this.contactForm.controls.email.setValidators([Validators.required, Validators.email]);
      this.contactForm.controls.phone.clearValidators();
    } else {
      this.contactForm.controls.phone.setValidators([
        Validators.required,
        Validators.pattern(/^\+?\d{10,15}$/),
      ]);
      this.contactForm.controls.email.clearValidators();
    }
    this.contactForm.controls.email.updateValueAndValidity({ emitEvent: false });
    this.contactForm.controls.phone.updateValueAndValidity({ emitEvent: false });
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
      },
    });
  }

  selectSlot(slot: SlotDto): void {
    this.selectedSlot.set(slot);
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
    return firstError(this.contactForm.controls[name]);
  }

  otpFieldError(): string | null {
    return firstError(this.otpForm.controls.code);
  }

  onRequestOtp(): void {
    this.otpError.set(null);
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    const value = this.contactForm.getRawValue();
    this.sending.set(true);
    this.verificationApi
      .request({
        channel: value.channel,
        email: value.channel === 'EMAIL' ? value.email : undefined,
        phone: value.channel === 'SMS' ? value.phone : undefined,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.verificationTarget.set(value.channel === 'EMAIL' ? value.email : value.phone);
          this.step.set('otp');
        },
        error: (err: ApiError) => {
          this.sending.set(false);
          this.otpError.set(err.message ?? 'Erro ao enviar código');
        },
      });
  }

  onConfirmOtp(): void {
    this.otpError.set(null);
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    const slot = this.selectedSlot();
    const channel = this.contactForm.controls.channel.value;
    const target =
      channel === 'EMAIL'
        ? this.contactForm.controls.email.value
        : this.contactForm.controls.phone.value;
    if (!slot || !target) return;

    this.confirming.set(true);
    this.verificationApi
      .confirm({ channel, target, code: this.otpForm.controls.code.value })
      .pipe()
      .subscribe({
        next: (response) => {
          this.verificationToken.set(response.verificationToken);
          this.submitAppointment(response.verificationToken);
        },
        error: (err: ApiError) => {
          this.confirming.set(false);
          this.otpError.set(err.message ?? 'Código inválido');
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
          email: value.channel === 'EMAIL' ? value.email : undefined,
          phone: value.channel === 'SMS' ? value.phone : undefined,
          notes: value.notes ?? null,
        },
        verificationToken: token,
      })
      .subscribe({
        next: () => {
          this.confirming.set(false);
          this.step.set('done');
        },
        error: (err: ApiError) => {
          this.confirming.set(false);
          this.otpError.set(err.message ?? 'Erro ao concluir agendamento');
        },
      });
  }
}
