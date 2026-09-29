import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmptyStateComponent, FormFieldComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import type { CompanyDto, UpdateCompanyRequest } from '@agendarhorario/contracts';
import { firstError, slugValidator } from '../../../core/forms/form-error';
import type { ApiError } from '../../../core/http/error.interceptor';
import {
  COMPANY_TIMEZONES,
  DEFAULT_BRAND_ACCENT,
  DEFAULT_BRAND_PRIMARY,
  companyInitial,
  logoFileError,
  normalizeHexColor,
  publicBookingLabel,
  publicBookingUrl,
  timezoneOptions,
} from './settings.logic';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CompaniesApi);
  private readonly destroyRef = inject(DestroyRef);

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
  readonly publishedSlug = signal('');
  readonly timezones = signal<string[]>([...COMPANY_TIMEZONES]);
  readonly copyLabel = signal('Copiar link');
  readonly primaryColor = signal(DEFAULT_BRAND_PRIMARY);
  readonly accentColor = signal(DEFAULT_BRAND_ACCENT);
  readonly serverLogoUrl = signal<string | null>(null);
  readonly logoObjectUrl = signal<string | null>(null);
  readonly logoFileName = signal<string | null>(null);
  readonly logoCleared = signal(false);
  readonly logoError = signal<string | null>(null);

  readonly previewLogoUrl = computed(() => {
    if (this.logoObjectUrl()) return this.logoObjectUrl();
    if (this.logoCleared()) return null;
    return this.serverLogoUrl();
  });
  readonly hasLogo = computed(() => !!this.previewLogoUrl());
  readonly logoLabel = computed(() => this.logoFileName() ?? 'Logo atual');

  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearCopyTimer();
      this.revokeLogo();
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (company) => {
          this.applyCompany(company);
          this.loading.set(false);
          this.loadedOnce.set(true);
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          this.loadError.set(err.message ?? 'Erro ao carregar empresa');
        },
      });
  }

  bookingLabel(): string {
    return publicBookingLabel(this.publishedSlug(), window.location.host);
  }

  bookingUrl(): string {
    return publicBookingUrl(this.publishedSlug(), window.location.origin);
  }

  slugHint(): string {
    const slug = this.form.controls.slug.value.trim() || this.publishedSlug();
    return `Usado em ${publicBookingLabel(slug, window.location.host)}`;
  }

  initial(name: string): string {
    return companyInitial(name);
  }

  error(name: 'name' | 'slug' | 'phone' | 'timezone'): string | null {
    return firstError(this.form.controls[name]);
  }

  copyLink(): void {
    const url = this.bookingUrl();
    void navigator.clipboard?.writeText(url).catch(() => undefined);
    this.copyLabel.set('Copiado!');
    this.clearCopyTimer();
    this.copyTimer = setTimeout(() => this.copyLabel.set('Copiar link'), 1800);
  }

  onPrimaryColor(event: Event): void {
    const next = normalizeHexColor((event.target as HTMLInputElement).value);
    if (next) this.primaryColor.set(next);
  }

  onAccentColor(event: Event): void {
    const next = normalizeHexColor((event.target as HTMLInputElement).value);
    if (next) this.accentColor.set(next);
  }

  resetColors(): void {
    this.primaryColor.set(DEFAULT_BRAND_PRIMARY);
    this.accentColor.set(DEFAULT_BRAND_ACCENT);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const error = logoFileError(file);
    if (error) {
      this.logoError.set(error);
      return;
    }
    this.revokeLogo();
    this.logoObjectUrl.set(URL.createObjectURL(file));
    this.logoFileName.set(file.name);
    this.logoCleared.set(false);
    this.logoError.set(null);
  }

  removeLogo(): void {
    this.revokeLogo();
    this.logoCleared.set(true);
    this.logoError.set(null);
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
      notificationPrefs: { ...value.notificationPrefs, email: true },
    };
    this.api
      .update(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (company) => {
          this.applyCompany(company);
          this.submitting.set(false);
          this.success.set(true);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(err.message ?? 'Não foi possível salvar');
        },
      });
  }

  private applyCompany(company: CompanyDto): void {
    this.publishedSlug.set(company.slug);
    this.serverLogoUrl.set(company.logoUrl);
    this.timezones.set(timezoneOptions(company.timezone));
    this.form.reset({
      name: company.name,
      slug: company.slug,
      phone: company.phone,
      timezone: company.timezone,
      notificationPrefs: { ...company.notificationPrefs, email: true },
    });
    this.form.controls.notificationPrefs.controls.email.disable({ emitEvent: false });
  }

  private clearCopyTimer(): void {
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = null;
  }

  private revokeLogo(): void {
    const url = this.logoObjectUrl();
    if (url) URL.revokeObjectURL(url);
    this.logoObjectUrl.set(null);
    this.logoFileName.set(null);
  }
}
