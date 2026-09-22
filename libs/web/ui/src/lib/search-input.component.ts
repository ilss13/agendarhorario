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
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss',
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
