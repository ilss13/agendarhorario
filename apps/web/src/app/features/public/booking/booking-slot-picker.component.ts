import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { DaySlotsDto, SlotDto } from '@agendarhorario/contracts';
import { bookingDayParts, slotClockLabel } from './booking-display';

@Component({
  selector: 'app-booking-slot-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-slot-picker.component.html',
  styleUrl: './booking-slot-picker.component.scss',
})
export class BookingSlotPickerComponent {
  readonly days = input.required<DaySlotsDto[]>();
  readonly selectedDate = input<string | null>(null);
  readonly selectedStart = input<string | null>(null);
  readonly datePicked = output<string>();
  readonly slotPicked = output<SlotDto>();
  readonly confirmed = output<void>();

  readonly dayParts = bookingDayParts;
  readonly clock = slotClockLabel;

  readonly activeDate = computed(() => this.selectedDate() ?? this.days()[0]?.date ?? null);
  readonly activeSlots = computed(
    () => this.days().find((day) => day.date === this.activeDate())?.slots ?? [],
  );
}
