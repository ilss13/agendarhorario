import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="search">
      <span class="sr-only">{{ label }}</span>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="#6b7280" stroke-width="2" />
        <path d="M21 21l-4.3-4.3" stroke="#6b7280" stroke-width="2" stroke-linecap="round" />
      </svg>
      <input
        type="search"
        [placeholder]="placeholder"
        [ngModel]="value()"
        (ngModelChange)="onInput($event)"
        [attr.aria-label]="label"
        autocomplete="off"
      />
      @if (value()) {
        <button type="button" class="clear" (click)="clear()" aria-label="Limpar busca">×</button>
      }
    </label>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .search {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.55rem 0.75rem;
        background: #fff;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        max-width: 360px;
      }
      .search:focus-within {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      }
      input {
        flex: 1;
        border: 0;
        outline: 0;
        font-size: 0.95rem;
        background: transparent;
      }
      .clear {
        border: 0;
        background: transparent;
        font-size: 1.25rem;
        cursor: pointer;
        color: #6b7280;
        line-height: 1;
        padding: 0 0.25rem;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `,
  ],
})
export class SearchInputComponent {
  @Input() placeholder = 'Buscar...';
  @Input() label = 'Buscar';
  @Input() set initialValue(value: string | null) {
    this.value.set(value ?? '');
  }
  @Output() readonly valueChange = new EventEmitter<string>();

  readonly value = signal<string>('');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  onInput(next: string): void {
    this.value.set(next);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.valueChange.emit(next), 300);
  }

  clear(): void {
    this.value.set('');
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.valueChange.emit('');
  }
}
