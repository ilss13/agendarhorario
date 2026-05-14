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
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="loading"><app-spinner /></div>
      } @else if (loadError()) {
        <app-empty-state
          title="Empresa não encontrada"
          [description]="loadError()"
          actionLabel="Tentar novamente"
          (action)="load()"
        />
      } @else if (company()) {
        <header class="hero">
          @if (company()!.logoUrl) {
            <img [src]="company()!.logoUrl" [alt]="company()!.name" />
          }
          <div>
            <h1>{{ company()!.name }}</h1>
            @if (company()!.phone) {
              <p class="muted">{{ company()!.phone }}</p>
            }
          </div>
        </header>

        <section>
          <h2>Serviços</h2>
          @if (company()!.services.length === 0) {
            <app-empty-state
              title="Nenhum serviço disponível"
              description="Esta empresa ainda não cadastrou serviços para agendamento."
            />
          } @else {
            <ul class="services">
              @for (s of company()!.services; track s.id) {
                <li>
                  <a [routerLink]="['agendar', s.id]" class="service-card">
                    <div>
                      <strong>{{ s.name }}</strong>
                      @if (s.description) {
                        <small>{{ s.description }}</small>
                      }
                      <small class="meta">
                        {{ s.durationMinutes }} min · R$ {{ s.price.toFixed(2) }}
                      </small>
                    </div>
                    <span class="cta">Agendar →</span>
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        <section class="hours">
          <h2>Horário de atendimento</h2>
          @if (company()!.businessHours.length === 0) {
            <p class="muted">Horários ainda não cadastrados.</p>
          } @else {
            <dl>
              @for (day of orderedDays; track day) {
                <div class="day-row">
                  <dt>{{ dayLabels[day] }}</dt>
                  <dd>{{ hoursForDay(company()!, day) }}</dd>
                </div>
              }
            </dl>
          }
        </section>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #f5f5f7;
        min-height: 100dvh;
      }
      .wrap {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem 1rem 4rem;
      }
      .hero {
        background: #fff;
        border-radius: 0.75rem;
        padding: 1.5rem;
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .hero img {
        width: 64px;
        height: 64px;
        border-radius: 0.75rem;
        object-fit: cover;
      }
      h1 {
        margin: 0;
        font-size: 1.5rem;
      }
      .muted {
        color: #6b7280;
        margin: 0.25rem 0 0;
      }
      h2 {
        font-size: 1.05rem;
        margin: 1.5rem 0 0.75rem;
      }
      ul.services {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }
      .service-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        background: #fff;
        padding: 1rem 1.25rem;
        border-radius: 0.75rem;
        text-decoration: none;
        color: inherit;
        border: 1px solid #e5e7eb;
        transition: border-color 0.15s ease;
      }
      .service-card:hover {
        border-color: #2563eb;
      }
      .service-card small {
        display: block;
        color: #6b7280;
        font-size: 0.85rem;
      }
      .service-card .meta {
        margin-top: 0.25rem;
        color: #111827;
      }
      .cta {
        color: #2563eb;
        font-weight: 600;
        white-space: nowrap;
      }
      .hours dl {
        background: #fff;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        margin: 0;
      }
      .day-row {
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #f3f4f6;
        padding: 0.4rem 0;
      }
      .day-row:first-child {
        border-top: 0;
      }
      dt {
        font-weight: 600;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 4rem 0;
      }
    `,
  ],
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
