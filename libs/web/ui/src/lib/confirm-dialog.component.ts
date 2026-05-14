import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="backdrop" (click)="onCancel()" role="presentation">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'dialog-title'"
          (click)="$event.stopPropagation()"
        >
          <h2 id="dialog-title">{{ title }}</h2>
          <p class="muted">{{ message }}</p>
          <div class="actions">
            <button type="button" class="secondary" (click)="onCancel()">{{ cancelLabel }}</button>
            <button type="button" class="danger" (click)="onConfirm()">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: grid;
        place-items: center;
        z-index: 50;
        padding: 1rem;
      }
      .dialog {
        background: #fff;
        border-radius: 0.75rem;
        padding: 1.5rem;
        max-width: 420px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      }
      h2 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
      }
      .muted {
        color: #6b7280;
        margin: 0 0 1.25rem;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      button {
        padding: 0.55rem 1rem;
        border: 0;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
      }
      .secondary {
        background: #f3f4f6;
        color: #111827;
      }
      .danger {
        background: #dc2626;
        color: #fff;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirmar';
  @Input() message = 'Tem certeza?';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
