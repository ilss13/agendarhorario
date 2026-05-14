import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  contentChild,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field" [attr.data-invalid]="invalid()">
      <span class="label">{{ label }}{{ required ? ' *' : '' }}</span>
      <ng-content></ng-content>
      @if (hint && !invalid()) {
        <small class="hint">{{ hint }}</small>
      }
      @if (invalid() && errorMessage) {
        <small class="error" role="alert">{{ errorMessage }}</small>
      }
    </label>
  `,
  styles: [
    `
      .field {
        display: grid;
        gap: 0.35rem;
      }
      .label {
        font-size: 0.875rem;
        font-weight: 500;
      }
      .hint {
        color: #6b7280;
        font-size: 0.8rem;
      }
      .error {
        color: #dc2626;
        font-size: 0.85rem;
      }
      :host ::ng-deep input,
      :host ::ng-deep select,
      :host ::ng-deep textarea {
        padding: 0.55rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.95rem;
        width: 100%;
        background: #fff;
      }
      :host ::ng-deep input:focus,
      :host ::ng-deep select:focus,
      :host ::ng-deep textarea:focus {
        outline: 2px solid #2563eb;
        outline-offset: 1px;
      }
      .field[data-invalid='true'] ::ng-deep input,
      .field[data-invalid='true'] ::ng-deep select,
      .field[data-invalid='true'] ::ng-deep textarea {
        border-color: #dc2626;
      }
    `,
  ],
})
export class FormFieldComponent {
  @Input({ required: true }) label!: string;
  @Input() hint: string | null = null;
  @Input() required = false;
  @Input() errorMessage: string | null = null;
  @Input() set forceInvalid(value: boolean | null | undefined) {
    this._forceInvalid.set(value ?? false);
  }

  private readonly _forceInvalid = signal(false);
  private readonly control = contentChild(NgControl);

  readonly invalid = computed(() => {
    if (this._forceInvalid()) return true;
    const c = this.control();
    if (!c || !c.control) return false;
    return c.control.invalid && (c.control.touched || c.control.dirty);
  });
}
