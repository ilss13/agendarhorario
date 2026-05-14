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
  template: `
    <div class="shell">
      <button
        type="button"
        class="menu-toggle"
        (click)="toggleDrawer()"
        [attr.aria-expanded]="drawerOpen()"
        aria-controls="admin-nav"
      >
        ☰
      </button>

      <aside id="admin-nav" class="sidebar" [attr.data-open]="drawerOpen()" (click)="closeDrawer()">
        <div class="brand">
          <strong>{{ company()?.name ?? 'Agendar Horário' }}</strong>
          @if (company()?.slug) {
            <small>/p/{{ company()!.slug }}</small>
          }
        </div>
        <nav>
          <a routerLink="empresa" routerLinkActive="active">Empresa</a>
          <a routerLink="servicos" routerLinkActive="active">Serviços</a>
          <a routerLink="horarios" routerLinkActive="active">Horários</a>
          <a routerLink="excecoes" routerLinkActive="active">Exceções / Feriados</a>
        </nav>
        <div class="user">
          <span>{{ auth.user()?.name }}</span>
          <button type="button" (click)="onLogout()">Sair</button>
        </div>
      </aside>

      @if (drawerOpen()) {
        <div class="backdrop" (click)="closeDrawer()" aria-hidden="true"></div>
      }

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
        background: #f5f5f7;
      }
      .shell {
        display: grid;
        grid-template-columns: 240px 1fr;
        min-height: 100dvh;
      }
      .menu-toggle {
        display: none;
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 30;
        border: 0;
        background: #fff;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 1.1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .sidebar {
        background: #ffffff;
        border-right: 1px solid #e5e7eb;
        padding: 1.5rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .brand {
        display: grid;
        line-height: 1.3;
      }
      .brand small {
        color: #6b7280;
        font-size: 0.78rem;
      }
      nav {
        display: grid;
        gap: 0.25rem;
      }
      nav a {
        padding: 0.55rem 0.75rem;
        border-radius: 0.5rem;
        text-decoration: none;
        color: #111827;
        font-size: 0.95rem;
      }
      nav a:hover {
        background: #f3f4f6;
      }
      nav a.active {
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 600;
      }
      .user {
        margin-top: auto;
        display: grid;
        gap: 0.5rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        font-size: 0.9rem;
        color: #4b5563;
      }
      .user button {
        background: transparent;
        border: 1px solid #d1d5db;
        padding: 0.4rem 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.4);
        z-index: 15;
      }
      .content {
        padding: 2rem 1.5rem;
        max-width: 1080px;
        width: 100%;
        margin: 0 auto;
      }
      @media (max-width: 768px) {
        .shell {
          grid-template-columns: 1fr;
        }
        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 20;
          width: 260px;
          transform: translateX(-100%);
          transition: transform 0.2s ease;
        }
        .sidebar[data-open='true'] {
          transform: translateX(0);
        }
        .menu-toggle {
          display: inline-block;
        }
        .content {
          padding: 4rem 1rem 2rem;
        }
      }
    `,
  ],
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
