import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import type { CompanyDto } from '@agendarhorario/contracts';
import { AuthService } from '../../core/auth/auth.service';

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
  readonly drawerOpen = signal(false);

  constructor() {
    this.companies.get().subscribe({
      next: (c) => this.company.set(c),
      error: () => this.company.set(null),
    });
  }

  toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
