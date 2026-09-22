import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicCompaniesApi } from '@agendarhorario/web-data-access';
import type { PublicCompanyDto } from '@agendarhorario/contracts';
import { DAY_LABELS_PT_BR } from '@agendarhorario/contracts';
import { EmptyStateComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import type { ApiError } from '../../core/http/error.interceptor';

@Component({
  selector: 'app-public-company-page',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-company.page.html',
  styleUrl: './public-company.page.scss',
})
export class PublicCompanyPageComponent {
  readonly orderedDays = [1, 2, 3, 4, 5, 6, 0];
  readonly dayLabels = DAY_LABELS_PT_BR;

  private readonly api = inject(PublicCompaniesApi);
  private readonly route = inject(ActivatedRoute);

  readonly company = signal<PublicCompanyDto | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getBySlug(slug).subscribe({
      next: (c) => {
        this.company.set(c);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Erro ao carregar');
      },
    });
  }

  hoursForDay(c: PublicCompanyDto, day: number): string {
    const intervals = c.businessHours.filter((h) => h.dayOfWeek === day);
    if (intervals.length === 0) return 'Fechado';
    return intervals.map((h) => `${h.startTime}–${h.endTime}`).join(', ');
  }
}
