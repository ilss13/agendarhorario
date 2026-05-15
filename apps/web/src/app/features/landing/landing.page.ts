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
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">{{ copy.brand }}</a>
      <nav>
        <a href="#planos">Planos</a>
        <a href="#como-funciona">Como funciona</a>
        <a href="#faq">FAQ</a>
        @if (auth.isAuthenticated()) {
          <a class="btn-link" [routerLink]="userHome()">Ir para o painel</a>
        } @else {
          <a class="btn-link" routerLink="/login">Entrar</a>
        }
      </nav>
    </header>

    <main>
      <section class="hero">
        <div class="hero-text">
          <span class="eyebrow">{{ copy.hero.eyebrow }}</span>
          <h1>{{ copy.hero.headline }}</h1>
          <p class="lead">{{ copy.hero.subheadline }}</p>
          <div class="hero-ctas">
            <a
              class="btn-primary"
              (click)="startSignup('basico')"
              [routerLink]="signupLink('basico')"
            >
              {{ copy.hero.primaryCta }}
            </a>
            <a class="btn-ghost" href="#planos">{{ copy.hero.secondaryCta }}</a>
          </div>
          <ul class="trust">
            @for (b of copy.hero.trustBadges; track b) {
              <li>✓ {{ b }}</li>
            }
          </ul>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="card-mock card-mock-1">
            <strong>Agenda de hoje</strong>
            <ul>
              <li><span>09:00</span> Maria Silva</li>
              <li><span>10:30</span> João Pereira</li>
              <li><span>14:00</span> Ana Souza</li>
            </ul>
          </div>
          <div class="card-mock card-mock-2">
            <strong>Página pública</strong>
            <small>/p/sua-empresa</small>
            <div class="slot-row">
              <span class="slot">09:00</span>
              <span class="slot selected">10:30</span>
              <span class="slot">14:00</span>
            </div>
          </div>
        </div>
      </section>

      <section class="social-proof" aria-label="prova-social">
        <p>{{ copy.socialProof.headline }}</p>
      </section>

      <section class="problems" id="problemas">
        <h2>{{ copy.problems.headline }}</h2>
        <ul class="problem-grid">
          @for (p of copy.problems.items; track p.title) {
            <li>
              <div class="icon" aria-hidden="true">✓</div>
              <strong>{{ p.title }}</strong>
              <p>{{ p.description }}</p>
            </li>
          }
        </ul>
      </section>

      <section class="pricing" id="planos">
        <header>
          <h2>{{ copy.pricing.headline }}</h2>
          <p class="muted">{{ copy.pricing.sub }}</p>
        </header>

        @if (loadingPlans()) {
          <p class="muted center">Carregando planos...</p>
        } @else if (plans().length === 0) {
          <p class="muted center">
            Estamos atualizando o catálogo de planos. Tente novamente em instantes.
          </p>
        } @else {
          <ul class="plan-grid">
            @for (p of plans(); track p.id) {
              <li [class.highlight]="copyOf(p)?.highlight">
                @if (copyOf(p)?.highlight) {
                  <span class="badge">Mais escolhido</span>
                }
                <strong class="plan-name">{{ p.name }}</strong>
                <div class="plan-price">R$ {{ p.priceBrl.toFixed(2) }}<small>/mês</small></div>
                <small class="plan-limit">
                  até {{ p.monthlyAppointmentLimit }} agendamentos/mês
                </small>
                <ul class="plan-features">
                  @for (f of copyOf(p)?.features ?? []; track f) {
                    <li>✓ {{ f }}</li>
                  }
                </ul>
                <a
                  class="btn-primary block"
                  [routerLink]="signupLink(p.code)"
                  (click)="startSignup(p.code)"
                >
                  Começar com {{ p.name }}
                </a>
              </li>
            }
          </ul>
        }
      </section>

      <section class="how" id="como-funciona">
        <h2>{{ copy.howItWorks.headline }}</h2>
        <ol class="how-steps">
          @for (s of copy.howItWorks.steps; track s.n) {
            <li>
              <span class="step-num">{{ s.n }}</span>
              <strong>{{ s.title }}</strong>
              <p>{{ s.description }}</p>
            </li>
          }
        </ol>
      </section>

      <section class="features">
        <h2>{{ copy.features.headline }}</h2>
        <ul class="feature-grid">
          @for (f of copy.features.items; track f.title) {
            <li>
              <strong>{{ f.title }}</strong>
              <p>{{ f.description }}</p>
            </li>
          }
        </ul>
      </section>

      <section class="faq" id="faq">
        <h2>{{ copy.faq.headline }}</h2>
        <ul>
          @for (item of copy.faq.items; track item.q) {
            <li>
              <details>
                <summary>{{ item.q }}</summary>
                <p>{{ item.a }}</p>
              </details>
            </li>
          }
        </ul>
      </section>

      <section class="cta-final">
        <h2>{{ copy.ctaFinal.headline }}</h2>
        <p>{{ copy.ctaFinal.sub }}</p>
        <a class="btn-primary" [routerLink]="signupLink('basico')" (click)="startSignup('basico')">
          {{ copy.ctaFinal.primaryCta }}
        </a>
      </section>
    </main>

    <footer class="site-footer">
      <span>{{ copy.footer.legal }}</span>
      <nav>
        @for (l of copy.footer.links; track l.label) {
          <a [href]="l.href">{{ l.label }}</a>
        }
      </nav>
    </footer>

    <a class="sticky-cta" [routerLink]="signupLink('basico')" (click)="startSignup('basico')">
      Comece agora
    </a>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #fff;
        color: #111827;
        font-family: inherit;
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid #eef2f7;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.85rem 1.5rem;
      }
      .brand {
        font-weight: 700;
        text-decoration: none;
        color: #111827;
        font-size: 1.05rem;
      }
      .topbar nav {
        margin-left: auto;
        display: flex;
        gap: 1.25rem;
        align-items: center;
      }
      .topbar nav a {
        color: #4b5563;
        text-decoration: none;
        font-weight: 500;
      }
      .topbar nav a.btn-link {
        color: #fff;
        background: #2563eb;
        padding: 0.45rem 0.9rem;
        border-radius: 0.5rem;
        font-weight: 600;
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 0 1.5rem 4rem;
      }
      section {
        padding: 4rem 0;
      }
      .hero {
        display: grid;
        grid-template-columns: 1.1fr 1fr;
        gap: 3rem;
        align-items: center;
        padding-top: 5rem;
      }
      .eyebrow {
        display: inline-block;
        padding: 0.25rem 0.7rem;
        border-radius: 999px;
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 1rem;
      }
      .hero h1 {
        font-size: clamp(2rem, 4vw, 3.25rem);
        line-height: 1.1;
        margin: 0 0 1rem;
      }
      .lead {
        font-size: 1.15rem;
        color: #4b5563;
        margin: 0 0 1.75rem;
        max-width: 32rem;
      }
      .hero-ctas {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .btn-primary {
        display: inline-block;
        padding: 0.85rem 1.4rem;
        background: #2563eb;
        color: #fff;
        text-decoration: none;
        border-radius: 0.6rem;
        font-weight: 700;
        font-size: 1rem;
        transition: transform 0.1s ease;
      }
      .btn-primary:hover {
        transform: translateY(-1px);
      }
      .btn-primary.block {
        display: block;
        text-align: center;
      }
      .btn-ghost {
        display: inline-block;
        padding: 0.85rem 1.4rem;
        color: #111827;
        text-decoration: none;
        border-radius: 0.6rem;
        border: 1px solid #d1d5db;
        font-weight: 600;
      }
      ul.trust {
        list-style: none;
        margin: 1.25rem 0 0;
        padding: 0;
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        color: #4b5563;
        font-size: 0.9rem;
      }

      .hero-art {
        position: relative;
        min-height: 360px;
      }
      .card-mock {
        position: absolute;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 1rem;
        padding: 1.25rem;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
      }
      .card-mock-1 {
        top: 0;
        left: 0;
        width: 75%;
      }
      .card-mock-1 ul {
        list-style: none;
        margin: 0.5rem 0 0;
        padding: 0;
      }
      .card-mock-1 li {
        display: flex;
        justify-content: space-between;
        padding: 0.4rem 0;
        border-top: 1px solid #f3f4f6;
      }
      .card-mock-1 li:first-of-type {
        border-top: 0;
      }
      .card-mock-1 li span {
        font-weight: 600;
        color: #2563eb;
        margin-right: 1rem;
      }
      .card-mock-2 {
        bottom: 0;
        right: 0;
        width: 70%;
      }
      .card-mock-2 small {
        color: #6b7280;
      }
      .slot-row {
        display: flex;
        gap: 0.4rem;
        margin-top: 0.75rem;
      }
      .slot {
        padding: 0.45rem 0.6rem;
        border: 1px solid #d1d5db;
        border-radius: 0.45rem;
        font-weight: 600;
      }
      .slot.selected {
        background: #2563eb;
        color: #fff;
        border-color: #2563eb;
      }

      .social-proof {
        text-align: center;
        padding: 1.5rem 0;
        color: #6b7280;
      }

      .problems {
        text-align: center;
      }
      .problems h2 {
        font-size: clamp(1.6rem, 3vw, 2.25rem);
        margin: 0 0 2rem;
      }
      ul.problem-grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        text-align: left;
      }
      ul.problem-grid li {
        background: #f9fafb;
        padding: 1.5rem;
        border-radius: 0.85rem;
      }
      ul.problem-grid .icon {
        display: inline-grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #ecfdf5;
        color: #047857;
        font-weight: 700;
        margin-bottom: 0.85rem;
      }
      ul.problem-grid strong {
        display: block;
        margin-bottom: 0.35rem;
      }
      ul.problem-grid p {
        margin: 0;
        color: #4b5563;
      }

      .pricing header {
        text-align: center;
        margin-bottom: 2.5rem;
      }
      .pricing h2 {
        font-size: clamp(1.6rem, 3vw, 2.25rem);
        margin: 0 0 0.5rem;
      }
      .muted {
        color: #6b7280;
      }
      .center {
        text-align: center;
      }
      ul.plan-grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.25rem;
      }
      ul.plan-grid li {
        position: relative;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 1rem;
        padding: 1.5rem 1.25rem;
        display: grid;
        gap: 0.55rem;
      }
      ul.plan-grid li.highlight {
        border-color: #2563eb;
        box-shadow: 0 8px 32px rgba(37, 99, 235, 0.18);
        transform: translateY(-6px);
      }
      .badge {
        position: absolute;
        top: -12px;
        right: 16px;
        background: #2563eb;
        color: #fff;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
      }
      .plan-name {
        font-size: 1.1rem;
      }
      .plan-price {
        font-size: 1.85rem;
        font-weight: 700;
      }
      .plan-price small {
        font-size: 0.9rem;
        color: #6b7280;
        font-weight: 500;
      }
      .plan-limit {
        color: #6b7280;
      }
      ul.plan-features {
        list-style: none;
        margin: 0.5rem 0;
        padding: 0;
        display: grid;
        gap: 0.4rem;
      }
      ul.plan-features li {
        background: transparent;
        padding: 0;
        margin: 0;
        font-size: 0.9rem;
        color: #4b5563;
      }

      .how h2 {
        text-align: center;
        font-size: clamp(1.6rem, 3vw, 2.25rem);
        margin: 0 0 2.5rem;
      }
      ol.how-steps {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }
      ol.how-steps li {
        background: #f9fafb;
        padding: 1.5rem;
        border-radius: 0.85rem;
      }
      .step-num {
        display: inline-grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        margin-bottom: 0.85rem;
      }
      ol.how-steps strong {
        display: block;
        margin-bottom: 0.35rem;
      }
      ol.how-steps p {
        margin: 0;
        color: #4b5563;
      }

      .features h2 {
        text-align: center;
        font-size: clamp(1.6rem, 3vw, 2.25rem);
        margin: 0 0 2.5rem;
      }
      ul.feature-grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }
      ul.feature-grid li {
        padding: 1.25rem;
        border-radius: 0.75rem;
        background: #f9fafb;
      }
      ul.feature-grid strong {
        display: block;
        margin-bottom: 0.35rem;
      }
      ul.feature-grid p {
        margin: 0;
        color: #4b5563;
      }

      .faq h2 {
        text-align: center;
        font-size: clamp(1.6rem, 3vw, 2.25rem);
        margin: 0 0 2rem;
      }
      .faq ul {
        list-style: none;
        margin: 0;
        padding: 0;
        max-width: 760px;
        margin-inline: auto;
        display: grid;
        gap: 0.5rem;
      }
      .faq details {
        background: #f9fafb;
        border-radius: 0.6rem;
        padding: 1rem 1.25rem;
      }
      .faq summary {
        font-weight: 600;
        cursor: pointer;
        list-style: none;
      }
      .faq summary::-webkit-details-marker {
        display: none;
      }
      .faq summary::after {
        content: '+';
        float: right;
        font-weight: 400;
      }
      .faq details[open] summary::after {
        content: '−';
      }
      .faq p {
        margin: 0.6rem 0 0;
        color: #4b5563;
      }

      .cta-final {
        text-align: center;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #fff;
        border-radius: 1.25rem;
        padding: 3rem 1.5rem;
        margin-top: 2rem;
      }
      .cta-final h2 {
        margin: 0 0 0.75rem;
        font-size: clamp(1.6rem, 3vw, 2.25rem);
      }
      .cta-final p {
        margin: 0 0 1.5rem;
        color: rgba(255, 255, 255, 0.85);
      }
      .cta-final .btn-primary {
        background: #fff;
        color: #1d4ed8;
      }

      .site-footer {
        max-width: 1120px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #eef2f7;
        color: #6b7280;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .site-footer nav {
        display: flex;
        gap: 1.25rem;
      }
      .site-footer a {
        color: #4b5563;
        text-decoration: none;
      }

      .sticky-cta {
        display: none;
      }

      @media (max-width: 900px) {
        .hero {
          grid-template-columns: 1fr;
          padding-top: 3rem;
          gap: 1.5rem;
        }
        .hero-art {
          min-height: 300px;
          margin-top: 1rem;
        }
        ul.problem-grid,
        ul.plan-grid,
        ol.how-steps,
        ul.feature-grid {
          grid-template-columns: 1fr;
        }
        .topbar nav a:not(.btn-link) {
          display: none;
        }
        .sticky-cta {
          display: block;
          position: fixed;
          left: 1rem;
          right: 1rem;
          bottom: 1rem;
          z-index: 40;
          background: #2563eb;
          color: #fff;
          text-align: center;
          padding: 0.9rem 1rem;
          border-radius: 0.75rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 20px 40px rgba(37, 99, 235, 0.35);
        }
        section {
          padding: 3rem 0;
        }
        ul.plan-grid li.highlight {
          transform: none;
        }
      }
    `,
  ],
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
    if (this.auth.isAuthenticated()) {
      return this.userHome();
    }
    return ['/registrar-empresa'];
  }

  startSignup(code: string): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate([this.userHome()]);
      return;
    }
    void this.router.navigate(['/registrar-empresa'], { queryParams: { plan: code } });
  }
}
