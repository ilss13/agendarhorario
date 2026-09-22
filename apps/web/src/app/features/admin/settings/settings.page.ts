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
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CompaniesApi);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, slugValidator]],
    phone: this.fb.control<string | null>(null),
    timezone: ['America/Sao_Paulo', [Validators.required]],
    notificationPrefs: this.fb.nonNullable.group({
      email: [true],
      secondaryChannel: ['NONE' as 'NONE' | 'SMS' | 'WHATSAPP'],
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
      notificationPrefs: { ...c.notificationPrefs },
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
      notificationPrefs: value.notificationPrefs,
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
