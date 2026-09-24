import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { applyOtpBackspace, applyOtpInput } from './booking-display';

@Component({
  selector: 'app-booking-otp-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-otp-input.component.html',
  styleUrl: './booking-otp-input.component.scss',
})
export class BookingOtpInputComponent {
  readonly code = input('');
  readonly disabled = input(false);
  readonly codeChange = output<string>();

  readonly indexes = [0, 1, 2, 3, 4, 5];
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('digit');
  readonly chars = computed(() =>
    this.code()
      .padEnd(6, ' ')
      .slice(0, 6)
      .split('')
      .map((char) => (/\d/.test(char) ? char : '')),
  );

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next = applyOtpInput(this.code(), index, input.value);
    input.value = next.code.padEnd(6, ' ')[index]?.trim() ?? '';
    this.codeChange.emit(next.code);
    this.focus(next.focusIndex);
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key !== 'Backspace') return;
    event.preventDefault();
    const next = applyOtpBackspace(this.code(), index);
    this.codeChange.emit(next.code);
    this.focus(next.focusIndex);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const next = applyOtpInput(this.code(), 0, text);
    this.codeChange.emit(next.code);
    this.focus(next.focusIndex);
  }

  private focus(index: number): void {
    queueMicrotask(() => this.boxes()[index]?.nativeElement.focus());
  }
}
