import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-booking-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-step.component.html',
  styleUrl: './booking-step.component.scss',
})
export class BookingStepComponent {
  readonly index = input.required<number>();
  readonly kicker = input.required<string>();
  readonly summary = input.required<string>();
  readonly open = input(false);
  readonly done = input(false);
  readonly locked = input(false);
  readonly toggled = output<void>();
}
