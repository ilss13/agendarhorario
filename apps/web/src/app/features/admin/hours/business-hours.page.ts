import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EmptyStateComponent,
  FormFieldComponent,
  PageHeaderComponent,
  SpinnerComponent,
} from '@agendarhorario/web-ui';
import { BusinessHoursApi } from '@agendarhorario/web-data-access';
import { DAY_LABELS_PT_BR, toMinutes } from '@agendarhorario/contracts';
import type { BusinessHourDto } from '@agendarhorario/contracts';
import type { ApiError } from '../../../core/http/error.interceptor';

interface HourRow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-business-hours-page',
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
      title="Horários de atendimento"
      subtitle="Defina os intervalos de funcionamento por dia da semana."
    />

    @if (loading() && !loadedOnce()) {
      <div class="loading"><app-spinner /></div>
    } @else if (loadError()) {
      <app-empty-state
        title="Não foi possível carregar"
        [description]="loadError()"
        actionLabel="Tentar novamente"
        (action)="reload()"
      />
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="days">
          @for (day of DAY_KEYS; track day) {
            <section class="day">
              <header>
                <h3>{{ dayLabels[day] }}</h3>
                <button type="button" class="link" (click)="addRow(day)">
                  + Adicionar intervalo
                </button>
              </header>

              @if (rowsForDay(day).length === 0) {
                <p class="muted">Fechado neste dia.</p>
              } @else {
                <ul>
                  @for (row of rowsForDay(day); track row.index) {
                    <li [formGroup]="row.group">
                      <app-form-field
                        label="Início"
                        [errorMessage]="rowError(row.group, 'startTime')"
                      >
                        <input type="time" formControlName="startTime" step="900" />
                      </app-form-field>
                      <app-form-field label="Fim" [errorMessage]="rowError(row.group, 'endTime')">
                        <input type="time" formControlName="endTime" step="900" />
                      </app-form-field>
                      <button
                        type="button"
                        class="remove"
                        (click)="removeRow(row.index)"
                        aria-label="Remover intervalo"
                      >
                        Remover
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>
          }
        </div>

        @if (overlapError()) {
          <p class="error" role="alert">{{ overlapError() }}</p>
        }
        @if (serverError()) {
          <p class="error" role="alert">{{ serverError() }}</p>
        }
        @if (success()) {
          <p class="success" role="status">Horários atualizados.</p>
        }

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Salvando...' : 'Salvar horários' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [
    `
      form {
        display: grid;
        gap: 1.25rem;
      }
      .days {
        display: grid;
        gap: 0.75rem;
      }
      .day {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1rem;
      }
      .day header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .day h3 {
        margin: 0;
        font-size: 1rem;
      }
      .link {
        background: transparent;
        border: 0;
        color: #2563eb;
        cursor: pointer;
        font-weight: 600;
      }
      ul {
        list-style: none;
        margin: 0.75rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.5rem;
      }
      li {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        align-items: end;
        gap: 0.75rem;
      }
      @media (max-width: 540px) {
        li {
          grid-template-columns: 1fr;
        }
      }
      .remove {
        border: 0;
        background: transparent;
        color: #dc2626;
        cursor: pointer;
        padding: 0.5rem 0;
      }
      .muted {
        color: #6b7280;
        margin: 0.75rem 0 0;
      }
      .error {
        color: #dc2626;
      }
      .success {
        color: #047857;
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
    `,
  ],
})
export class BusinessHoursPageComponent {
  readonly DAY_KEYS = [1, 2, 3, 4, 5, 6, 0];
  readonly dayLabels = DAY_LABELS_PT_BR;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BusinessHoursApi);

  readonly form = this.fb.group({
    hours: this.fb.array<FormGroup>([]),
  });
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly success = signal(false);
  readonly overlapError = signal<string | null>(null);

  readonly rowsByDay = computed(() => {
    const result = new Map<number, { group: FormGroup; index: number }[]>();
    this.hoursArray.controls.forEach((c, index) => {
      const day = c.get('dayOfWeek')?.value as number;
      const list = result.get(day) ?? [];
      list.push({ group: c as FormGroup, index });
      result.set(day, list);
    });
    return result;
  });

  constructor() {
    this.reload();
  }

  get hoursArray(): FormArray<FormGroup> {
    return this.form.controls.hours;
  }

  rowsForDay(day: number): { group: FormGroup; index: number }[] {
    return this.rowsByDay().get(day) ?? [];
  }

  rowError(group: FormGroup, name: string): string | null {
    const control = group.get(name);
    if (!control?.touched && !control?.dirty) return null;
    if (!control?.errors) return null;
    if (control.errors['required']) return 'Obrigatório';
    if (group.errors?.['endBeforeStart']) return 'Fim deve ser após início';
    return 'Inválido';
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list().subscribe({
      next: (items) => {
        this.applyHours(items);
        this.loading.set(false);
        this.loadedOnce.set(true);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar horários');
      },
    });
  }

  private applyHours(items: BusinessHourDto[]): void {
    this.hoursArray.clear();
    for (const i of items) {
      this.hoursArray.push(this.buildRow(i));
    }
  }

  private buildRow(input?: HourRow): FormGroup {
    const group = this.fb.group(
      {
        dayOfWeek: [input?.dayOfWeek ?? 1, [Validators.required]],
        startTime: [
          input?.startTime ?? '09:00',
          [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)],
        ],
        endTime: [
          input?.endTime ?? '18:00',
          [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)],
        ],
      },
      { validators: orderedRangeValidator },
    );
    return group;
  }

  addRow(day: number): void {
    this.hoursArray.push(this.buildRow({ dayOfWeek: day, startTime: '09:00', endTime: '18:00' }));
  }

  removeRow(index: number): void {
    this.hoursArray.removeAt(index);
  }

  onSubmit(): void {
    this.serverError.set(null);
    this.success.set(false);
    this.overlapError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const rows: HourRow[] = this.hoursArray.controls.map((c) => ({
      dayOfWeek: c.value.dayOfWeek,
      startTime: c.value.startTime,
      endTime: c.value.endTime,
    }));
    const overlap = detectOverlap(rows);
    if (overlap) {
      this.overlapError.set(overlap);
      return;
    }

    this.submitting.set(true);
    this.api.replace({ hours: rows }).subscribe({
      next: (items) => {
        this.applyHours(items);
        this.submitting.set(false);
        this.success.set(true);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message ?? 'Erro ao salvar');
      },
    });
  }
}

const orderedRangeValidator = (group: FormGroup) => {
  const start = group.get('startTime')?.value as string | undefined;
  const end = group.get('endTime')?.value as string | undefined;
  if (!start || !end) return null;
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
  return toMinutes(end) > toMinutes(start) ? null : { endBeforeStart: true };
};

const detectOverlap = (rows: HourRow[]): string | null => {
  const byDay = new Map<number, HourRow[]>();
  for (const r of rows) {
    const list = byDay.get(r.dayOfWeek) ?? [];
    list.push(r);
    byDay.set(r.dayOfWeek, list);
  }
  for (const [day, list] of byDay) {
    const sorted = [...list].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        return `Intervalos sobrepostos em ${DAY_LABELS_PT_BR[day]}: ${sorted[i - 1].startTime}-${sorted[i - 1].endTime} e ${sorted[i].startTime}-${sorted[i].endTime}`;
      }
    }
  }
  return null;
};
