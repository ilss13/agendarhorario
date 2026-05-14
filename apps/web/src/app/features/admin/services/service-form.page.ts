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
  template: `
    <app-page-header
      [title]="isEdit() ? 'Editar serviço' : 'Novo serviço'"
      subtitle="Defina nome, duração e preço."
    >
      <a slot="actions" routerLink=".." routerLinkActive class="btn-secondary">← Voltar</a>
    </app-page-header>

    @if (loading()) {
      <div class="loading"><app-spinner /></div>
    } @else if (loadError()) {
      <app-empty-state
        title="Serviço não encontrado"
        [description]="loadError()"
        actionLabel="Voltar para lista"
        (action)="back()"
      />
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <app-form-field label="Nome" [required]="true" [errorMessage]="error('name')">
          <input type="text" formControlName="name" maxlength="120" />
        </app-form-field>

        <app-form-field label="Descrição" [errorMessage]="error('description')">
          <textarea
            formControlName="description"
            rows="3"
            maxlength="500"
            placeholder="Detalhes para seus clientes (opcional)"
          ></textarea>
        </app-form-field>

        <div class="grid">
          <app-form-field
            label="Duração (minutos)"
            [required]="true"
            [errorMessage]="error('durationMinutes')"
          >
            <input
              type="number"
              inputmode="numeric"
              min="5"
              max="480"
              formControlName="durationMinutes"
            />
          </app-form-field>

          <app-form-field
            label="Intervalo após (minutos)"
            hint="Tempo de buffer entre atendimentos"
            [errorMessage]="error('bufferMinutes')"
          >
            <input
              type="number"
              inputmode="numeric"
              min="0"
              max="240"
              formControlName="bufferMinutes"
            />
          </app-form-field>

          <app-form-field label="Preço (R$)" [errorMessage]="error('price')">
            <input type="number" min="0" step="0.01" formControlName="price" />
          </app-form-field>

          <app-form-field label="Ativo">
            <label class="checkbox">
              <input type="checkbox" formControlName="active" />
              <span>Disponível para agendamento</span>
            </label>
          </app-form-field>
        </div>

        @if (serverError()) {
          <p class="error" role="alert">{{ serverError() }}</p>
        }

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || submitting()">
            {{
              submitting() ? 'Salvando...' : isEdit() ? 'Salvar alterações' : 'Cadastrar serviço'
            }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [
    `
      form {
        background: #fff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        display: grid;
        gap: 1rem;
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
      textarea {
        width: 100%;
        padding: 0.55rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.95rem;
        font-family: inherit;
        resize: vertical;
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 3rem 1rem;
      }
      .btn-secondary {
        padding: 0.55rem 1rem;
        background: #f3f4f6;
        color: #111827;
        text-decoration: none;
        border-radius: 0.5rem;
        font-weight: 600;
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
      .error {
        color: #dc2626;
      }
    `,
  ],
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
    void this.router.navigate(['/admin/servicos']);
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
        void this.router.navigate(['/admin/servicos']);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message ?? 'Erro ao salvar');
      },
    });
  }
}
