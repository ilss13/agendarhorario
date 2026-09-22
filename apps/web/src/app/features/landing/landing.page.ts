import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BillingApi } from '@agendarhorario/web-data-access';
import type { PlanDto } from '@agendarhorario/contracts';
import { AuthService } from '../../core/auth/auth.service';
import { defaultRouteForUser } from '../../core/auth/redirect-after-login';
import { LANDING_COPY } from './landing.copy';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
})
export class LandingPageComponent {
  readonly copy = LANDING_COPY;
  readonly plans = signal<PlanDto[]>([]);
  readonly loadingPlans = signal(true);

  private readonly billing = inject(BillingApi);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly userHome = computed(() => {
    const user = this.auth.user();
    return user ? defaultRouteForUser(user) : '/login';
  });

  constructor() {
    this.billing.plans().subscribe({
      next: (plans) => {
        this.plans.set(plans.sort((a, b) => a.sortOrder - b.sortOrder));
        this.loadingPlans.set(false);
      },
      error: () => {
        this.plans.set([]);
        this.loadingPlans.set(false);
      },
    });
  }

  copyOf(plan: PlanDto): { highlight?: boolean; features: string[] } | undefined {
    return this.copy.pricing.plans.find((p) => p.code === plan.code);
  }

  signupLink(code: string): string[] | string {
    const user = this.auth.user();
    if (user?.role === 'OWNER' || user?.role === 'STAFF') {
      return ['/dashboard/assinatura'];
    }
    if (this.auth.isAuthenticated()) {
      return this.userHome();
    }
    return ['/registrar-empresa'];
  }

  startSignup(code: string): void {
    const user = this.auth.user();
    if (user?.role === 'OWNER' || user?.role === 'STAFF') {
      void this.router.navigate(['/dashboard/assinatura'], { queryParams: { plan: code } });
      return;
    }
    if (this.auth.isAuthenticated()) {
      void this.router.navigate([this.userHome()]);
      return;
    }
    void this.router.navigate(['/registrar-empresa'], { queryParams: { plan: code } });
  }
}
