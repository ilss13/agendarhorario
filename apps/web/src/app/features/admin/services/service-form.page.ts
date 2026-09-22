import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EmptyStateComponent,
  FormFieldComponent,
  PageHeaderComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { ServicesApi } from '@agendarhorario/web-data-access';
import type { ServiceDto } from '@agendarhorario/contracts';
import { firstError } from '../../../core/forms/form-error';
import type { ApiError } from '../../../core/http/error.interceptor';

@Component({
  selector: 'app-service-form-page',
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
  templateUrl: './service-form.page.html',
  styleUrl: './service-form.page.scss',
})
export class ServiceFormPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ServicesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    durationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(8 * 60)]],
    bufferMinutes: [0, [Validators.required, Validators.min(0), Validators.max(240)]],
    price: [0, [Validators.required, Validators.min(0)]],
    active: [true],
  });

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly id = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id.set(id);
      this.load(id);
    }
  }

  isEdit(): boolean {
    return this.id() !== null;
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: (s) => {
        this.applyService(s);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Serviço não encontrado');
      },
    });
  }

  private applyService(s: ServiceDto): void {
    this.form.reset({
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      bufferMinutes: s.bufferMinutes,
      price: s.price,
      active: s.active,
    });
  }

  error(
    name: 'name' | 'description' | 'durationMinutes' | 'bufferMinutes' | 'price',
  ): string | null {
    return firstError(this.form.controls[name]);
  }

  back(): void {
    void this.router.navigate(['/dashboard/servicos']);
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    const payload = {
      name: value.name,
      description: value.description ?? null,
      durationMinutes: value.durationMinutes,
      bufferMinutes: value.bufferMinutes,
      price: value.price,
      active: value.active,
    };
    const id = this.id();
    const op$ = id ? this.api.update(id, payload) : this.api.create(payload);
    op$.subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/dashboard/servicos']);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message ?? 'Erro ao salvar');
      },
    });
  }
}
