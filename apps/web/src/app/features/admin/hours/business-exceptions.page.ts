import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ConfirmDialogComponent,
  EmptyStateComponent,
  FormFieldComponent,
  PageHeaderComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { BusinessExceptionsApi } from '@agendarhorario/web-data-access';
import { businessExceptionInputSchema, toMinutes } from '@agendarhorario/contracts';
import type { BusinessExceptionDto } from '@agendarhorario/contracts';
import { firstError } from '../../../core/forms/form-error';
import type { ApiError } from '../../../core/http/error.interceptor';

@Component({
  selector: 'app-business-exceptions-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FormFieldComponent,
    EmptyStateComponent,
    SpinnerComponent,
    ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-exceptions.page.html',
  styleUrl: './business-exceptions.page.scss',
})
export class BusinessExceptionsPageComponent {
  readonly today = new Date().toISOString().slice(0, 10);

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BusinessExceptionsApi);

  readonly form = this.fb.nonNullable.group({
    date: [this.today, [Validators.required]],
    fullDay: [true],
    startTime: this.fb.control<string | null>(null),
    endTime: this.fb.control<string | null>(null),
    reason: this.fb.control<string | null>(null, [Validators.maxLength(200)]),
  });

  readonly items = signal<BusinessExceptionDto[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly success = signal(false);
  readonly toRemove = signal<BusinessExceptionDto | null>(null);

  constructor() {
    this.reload();
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  error(name: 'date' | 'startTime' | 'endTime' | 'reason'): string | null {
    return firstError(this.form.controls[name]);
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar exceções');
      },
    });
  }

  onSubmit(): void {
    this.formError.set(null);
    this.success.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const candidate = {
      date: value.date,
      fullDay: value.fullDay,
      startTime: value.fullDay ? null : value.startTime,
      endTime: value.fullDay ? null : value.endTime,
      reason: value.reason,
    };
    if (!value.fullDay) {
      if (!value.startTime || !value.endTime) {
        this.formError.set('Informe início e fim');
        return;
      }
      if (toMinutes(value.endTime) <= toMinutes(value.startTime)) {
        this.formError.set('Fim deve ser após o início');
        return;
      }
    }
    const parsed = businessExceptionInputSchema.safeParse(candidate);
    if (!parsed.success) {
      this.formError.set(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    this.submitting.set(true);
    this.api.create(parsed.data).subscribe({
      next: (created) => {
        this.items.update((list) => [created, ...list]);
        this.submitting.set(false);
        this.success.set(true);
        this.form.reset({
          date: this.today,
          fullDay: true,
          startTime: null,
          endTime: null,
          reason: null,
        });
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.formError.set(err.message ?? 'Erro ao salvar');
      },
    });
  }

  askRemove(item: BusinessExceptionDto): void {
    this.toRemove.set(item);
  }

  confirmRemove(): void {
    const target = this.toRemove();
    if (!target) return;
    this.toRemove.set(null);
    this.items.update((list) => list.filter((i) => i.id !== target.id));
    this.api.remove(target.id).subscribe({
      error: () => this.reload(),
    });
  }
}
