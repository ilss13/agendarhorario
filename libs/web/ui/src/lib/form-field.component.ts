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
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
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
