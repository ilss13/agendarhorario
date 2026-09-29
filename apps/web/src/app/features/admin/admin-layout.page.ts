import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import type { CompanyDto } from '@agendarhorario/contracts';
import { AuthService } from '../../core/auth/auth.service';
import { isMoreSection } from './more/more.logic';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.page.html',
  styleUrl: './admin-layout.page.scss',
})
export class AdminLayoutPageComponent {
  readonly auth = inject(AuthService);
  private readonly companies = inject(CompaniesApi);
  private readonly router = inject(Router);

  readonly company = signal<CompanyDto | null>(null);
  readonly moreActive = signal(false);

  constructor() {
    this.companies.get().subscribe({
      next: (c) => this.company.set(c),
      error: () => this.company.set(null),
    });
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.syncMore();
    });
    this.syncMore();
  }

  initial(value: string | null | undefined): string {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed.charAt(0).toLocaleUpperCase('pt-BR') : '·';
  }

  private syncMore(): void {
    this.moreActive.set(isMoreSection(this.router.url));
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
