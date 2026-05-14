import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty" [attr.role]="'status'" [attr.aria-live]="'polite'">
      <div class="illustration" aria-hidden="true">
        <!-- minimal inline SVG -->
        <svg viewBox="0 0 64 64" width="56" height="56">
          <circle cx="32" cy="32" r="28" fill="#e0e7ff" />
          <path
            d="M20 36c0-6.6 5.4-12 12-12s12 5.4 12 12"
            stroke="#4f46e5"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
          />
          <circle cx="26" cy="28" r="2" fill="#4f46e5" />
          <circle cx="38" cy="28" r="2" fill="#4f46e5" />
        </svg>
      </div>
      <h2>{{ title }}</h2>
      @if (description) {
        <p class="muted">{{ description }}</p>
      }
      @if (actionLabel) {
        <button type="button" (click)="action.emit()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styles: [
    `
      .empty {
        display: grid;
        gap: 0.5rem;
        justify-items: center;
        text-align: center;
        padding: 3rem 1rem;
        background: #fff;
        border: 1px dashed #e5e7eb;
        border-radius: 0.75rem;
      }
      .illustration {
        display: grid;
        place-items: center;
        padding: 0.5rem;
      }
      h2 {
        margin: 0.25rem 0 0;
        font-size: 1.05rem;
        font-weight: 600;
      }
      .muted {
        color: #6b7280;
        margin: 0;
        max-width: 32rem;
      }
      button {
        margin-top: 0.75rem;
        padding: 0.55rem 1rem;
        border: 0;
        background: #2563eb;
        color: #fff;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() title = 'Nada por aqui ainda';
  @Input() description: string | null = null;
  @Input() actionLabel: string | null = null;
  @Output() action = new EventEmitter<void>();
}
