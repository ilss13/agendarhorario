import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@agendarhorario/web-ui';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customers.page.html',
  styleUrl: './customers.page.scss',
})
export class CustomersPageComponent {}
