import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EmptyStateComponent,
  FormFieldComponent,
  PageHeaderComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import type { CompanyDto, UpdateCompanyRequest } from '@agendarhorario/contracts';
import { firstError, slugValidator } from '../../../core/forms/form-error';
import type { ApiError } from '../../../core/http/error.interceptor';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FormFieldComponent,
    EmptyStateComponent,
    SpinnerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Empresa"
      subtitle="Atualize os dados da sua empresa e as preferências de notificação."
    />

    @if (loading() && !loadedOnce()) {
      <div class="loading"><app-spinner /></div>
    } @else if (loadError()) {
      <app-empty-state
        title="Não foi possível carregar"
        [description]="loadError()"
        actionLabel="Tentar novamente"
        (action)="load()"
      />
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="grid">
          <app-form-field label="Nome da empresa" [required]="true" [errorMessage]="error('name')">
            <input type="text" formControlName="name" maxlength="120" />
          </app-form-field>

          <app-form-field
            label="Slug público"
            hint="Usado em /p/SEU-SLUG"
            [required]="true"
            [errorMessage]="error('slug')"
          >
            <input type="text" formControlName="slug" />
          </app-form-field>

          <app-form-field label="Telefone" [errorMessage]="error('phone')">
            <input type="tel" formControlName="phone" placeholder="+5511999999999" />
          </app-form-field>

          <app-form-field label="Fuso horário" [errorMessage]="error('timezone')">
            <input type="text" formControlName="timezone" />
          </app-form-field>
        </div>

        <fieldset class="toggles" formGroupName="notificationToggles">
          <legend>Notificações</legend>
          <label> <input type="checkbox" formControlName="email" /> Enviar por e-mail </label>
          <label> <input type="checkbox" formControlName="sms" /> Enviar por SMS </label>
          <label> <input type="checkbox" formControlName="whatsapp" /> Enviar por WhatsApp </label>
        </fieldset>

        @if (success()) {
          <p class="success" role="status">Alterações salvas.</p>
        }
        @if (serverError()) {
          <p class="error" role="alert">{{ serverError() }}</p>
        }

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Salvando...' : 'Salvar alterações' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [
    `
      .loading {
        display: grid;
        place-items: center;
        padding: 3rem 1rem;
      }
      form {
        background: #fff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        display: grid;
        gap: 1.25rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }
      @media (max-width: 600px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
      fieldset.toggles {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        display: grid;
        gap: 0.5rem;
      }
      fieldset.toggles label {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      .actions button {
        padding: 0.65rem 1.25rem;
        border: 0;
        border-radius: 0.5rem;
        background: #2563eb;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      .actions button:disabled {
        opacity: 0.55;
      }
      .success {
        color: #047857;
      }
      .error {
        color: #dc2626;
      }
    `,
  ],
})
export class SettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CompaniesApi);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, slugValidator]],
    phone: this.fb.control<string | null>(null),
    timezone: ['America/Sao_Paulo', [Validators.required]],
    notificationToggles: this.fb.nonNullable.group({
      email: [true],
      sms: [false],
      whatsapp: [false],
    }),
  });

  readonly loading = signal(false);
  readonly loadedOnce = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly success = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get().subscribe({
      next: (c) => {
        this.applyCompany(c);
        this.loading.set(false);
        this.loadedOnce.set(true);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar empresa');
      },
    });
  }

  private applyCompany(c: CompanyDto): void {
    this.form.reset({
      name: c.name,
      slug: c.slug,
      phone: c.phone,
      timezone: c.timezone,
      notificationToggles: { ...c.notificationToggles },
    });
  }

  error(name: 'name' | 'slug' | 'phone' | 'timezone'): string | null {
    return firstError(this.form.controls[name]);
  }

  onSubmit(): void {
    this.success.set(false);
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    const payload: UpdateCompanyRequest = {
      name: value.name,
      slug: value.slug,
      phone: value.phone ?? null,
      timezone: value.timezone,
      notificationToggles: value.notificationToggles,
    };
    this.api.update(payload).subscribe({
      next: (c) => {
        this.applyCompany(c);
        this.submitting.set(false);
        this.success.set(true);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message ?? 'Não foi possível salvar');
      },
    });
  }
}
