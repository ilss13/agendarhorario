import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BillingApi } from '@agendarhorario/web-data-access';
import { AuthService } from '../../core/auth/auth.service';
import { defaultRouteForUser } from '../../core/auth/redirect-after-login';
import { LandingIconComponent } from './landing-icon.component';
import { LANDING_COPY } from './landing.copy';
import { isLandingLeadEmail } from './landing.lead';
import { LANDING_PLAN_CARDS, landingPlanCards, type LandingPlanCard } from './landing.plans';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, LandingIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
})
export class LandingPageComponent {
  readonly copy = LANDING_COPY;
  readonly plans = signal<LandingPlanCard[]>(LANDING_PLAN_CARDS);
  readonly leadError = signal<'hero' | 'final' | null>(null);

  private readonly billing = inject(BillingApi);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly userHome = computed(() => {
    const user = this.auth.user();
    return user ? defaultRouteForUser(user) : '/login';
  });

  constructor() {
    this.billing.plans().subscribe({
      next: (plans) => this.plans.set(landingPlanCards(plans)),
      error: () => this.plans.set(LANDING_PLAN_CARDS),
    });
  }

  formatPrice(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  submitLead(event: Event, source: 'hero' | 'final'): void {
    event.preventDefault();
    const email = String(new FormData(event.target as HTMLFormElement).get('email') ?? '');
    if (!isLandingLeadEmail(email)) {
      this.leadError.set(source);
      return;
    }
    this.leadError.set(null);
    const trimmed = email.trim();
    const user = this.auth.user();
    if (user?.role === 'OWNER' || user?.role === 'STAFF') {
      void this.router.navigate(['/dashboard/assinatura']);
      return;
    }
    if (this.auth.isAuthenticated()) {
      void this.router.navigate([this.userHome()]);
      return;
    }
    void this.router.navigate(['/registrar-empresa'], { queryParams: { email: trimmed } });
  }
}
