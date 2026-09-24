import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PublicServiceDto } from '@agendarhorario/contracts';
import { formatServicePrice } from './booking-display';

@Component({
  selector: 'app-booking-service-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-service-picker.component.html',
  styleUrl: './booking-service-picker.component.scss',
})
export class BookingServicePickerComponent {
  readonly services = input.required<PublicServiceDto[]>();
  readonly selectedId = input<string | null>(null);
  readonly picked = output<string>();
  readonly priceLabel = formatServicePrice;
}
