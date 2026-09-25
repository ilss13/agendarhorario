import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { LandingIconName } from './landing.copy';

@Component({
  selector: 'app-landing-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-icon.component.html',
})
export class LandingIconComponent {
  readonly name = input.required<LandingIconName>();
  readonly size = input(24);
}
