import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-agenda-view-switcher',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-view-switcher.component.html',
  styleUrl: './agenda-view-switcher.component.scss',
})
export class AgendaViewSwitcherComponent {
  @Input() current: 'week' | 'month' | 'history' = 'month';
}
