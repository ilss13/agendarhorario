import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { companyInitials, formatDisplayPhone } from './booking-display';

@Component({
  selector: 'app-booking-identity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-identity.component.html',
  styleUrl: './booking-identity.component.scss',
})
export class BookingIdentityComponent {
  readonly name = input.required<string>();
  readonly phone = input<string | null>(null);
  readonly logoUrl = input<string | null>(null);
  readonly hoursLabel = input<string | null>(null);
  readonly stepLabel = input('');

  readonly logoFailed = signal(false);

  readonly initials = computed(() => companyInitials(this.name()));
  readonly displayPhone = computed(() => formatDisplayPhone(this.phone()));
  readonly mobileSubtitle = computed(() => this.hoursLabel() ?? this.displayPhone());
}
