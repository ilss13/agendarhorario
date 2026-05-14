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
  template: `
    <app-page-header
      title="Exceções / Feriados"
      subtitle="Bloqueie datas específicas ou janelas parciais do atendimento."
    />

    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="form-card">
      <div class="grid">
        <app-form-field label="Data" [required]="true" [errorMessage]="error('date')">
          <input type="date" formControlName="date" [min]="today" />
        </app-form-field>

        <app-form-field label="Tipo">
          <label class="checkbox">
            <input type="checkbox" formControlName="fullDay" />
            <span>Dia inteiro</span>
          </label>
        </app-form-field>

        @if (!form.controls.fullDay.value) {
          <app-form-field label="Início" [errorMessage]="error('startTime')">
            <input type="time" formControlName="startTime" step="900" />
          </app-form-field>
          <app-form-field label="Fim" [errorMessage]="error('endTime')">
            <input type="time" formControlName="endTime" step="900" />
          </app-form-field>
        }

        <app-form-field label="Motivo (opcional)" [errorMessage]="error('reason')">
          <input
            type="text"
            formControlName="reason"
            maxlength="200"
            placeholder="Feriado, férias, evento..."
          />
        </app-form-field>
      </div>

      @if (formError()) {
        <p class="error" role="alert">{{ formError() }}</p>
      }
      @if (success()) {
        <p class="success" role="status">Exceção adicionada.</p>
      }

      <div class="actions">
        <button type="submit" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Salvando...' : 'Adicionar exceção' }}
        </button>
      </div>
    </form>

    <h2 class="section">Exceções cadastradas</h2>

    @if (loading() && items().length === 0) {
      <div class="loading"><app-spinner /></div>
    } @else if (loadError()) {
      <app-empty-state
        title="Não foi possível carregar"
        [description]="loadError()"
        actionLabel="Tentar novamente"
        (action)="reload()"
      />
    } @else if (items().length === 0) {
      <app-empty-state
        title="Nenhuma exceção"
        description="Cadastre feriados ou bloqueios pontuais usando o formulário acima."
      />
    } @else {
      <ul class="list">
        @for (item of items(); track item.id) {
          <li>
            <div>
              <strong>{{ formatDate(item.date) }}</strong>
              <small>
                @if (item.fullDay) {
                  Dia inteiro
                } @else {
                  {{ item.startTime }}–{{ item.endTime }}
                }
                @if (item.reason) {
                  · {{ item.reason }}
                }
              </small>
            </div>
            <button type="button" class="delete" (click)="askRemove(item)">Remover</button>
          </li>
        }
      </ul>
    }

    <app-confirm-dialog
      [open]="!!toRemove()"
      title="Remover exceção"
      [message]="'Remover bloqueio de ' + formatDate(toRemove()?.date ?? '') + '?'"
      confirmLabel="Remover"
      (confirmed)="confirmRemove()"
      (cancelled)="toRemove.set(null)"
    />
  `,
  styles: [
    `
      .form-card {
        background: #fff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        display: grid;
        gap: 1rem;
        margin-bottom: 1.5rem;
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
      .checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
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
      .section {
        margin: 0 0 0.75rem;
        font-size: 1.05rem;
      }
      ul.list {
        list-style: none;
        margin: 0;
        padding: 0;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        overflow: hidden;
      }
      ul.list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.85rem 1rem;
        border-top: 1px solid #f3f4f6;
        gap: 1rem;
      }
      ul.list li:first-child {
        border-top: 0;
      }
      ul.list small {
        color: #6b7280;
        display: block;
      }
      .delete {
        border: 0;
        background: transparent;
        color: #dc2626;
        cursor: pointer;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 3rem 1rem;
      }
      .error {
        color: #dc2626;
      }
      .success {
        color: #047857;
      }
    `,
  ],
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
