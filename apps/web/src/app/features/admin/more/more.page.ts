import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import type { CompanyDto } from '@agendarhorario/contracts';
import { AuthService } from '../../../core/auth/auth.service';
import { companyInitial } from '../settings/settings.logic';

@Component({
  selector: 'app-more-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './more.page.html',
  styleUrl: './more.page.scss',
})
export class MorePageComponent {
  readonly auth = inject(AuthService);
  private readonly companies = inject(CompaniesApi);
  private readonly router = inject(Router);

  readonly company = signal<CompanyDto | null>(null);

  constructor() {
    this.companies.get().subscribe({
      next: (company) => this.company.set(company),
      error: () => this.company.set(null),
    });
  }

  initial(value: string | null | undefined): string {
    return companyInitial(value ?? '');
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
