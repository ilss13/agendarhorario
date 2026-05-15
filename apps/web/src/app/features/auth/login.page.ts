import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { defaultRouteForUser } from '../../core/auth/redirect-after-login';
import { ApiError } from '../../core/http/error.interceptor';
import { firstError } from '../../core/forms/form-error';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-wrap">
      <section class="auth-card">
        <h1>Entrar</h1>
        <p class="muted">Acesse o painel da sua empresa.</p>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          novalidate
          aria-describedby="login-form-error"
        >
          <label class="field">
            <span>Email</span>
            <input
              type="email"
              formControlName="email"
              autocomplete="email"
              [attr.aria-invalid]="error('email') !== null"
            />
            @if (error('email')) {
              <small class="error">{{ error('email') }}</small>
            }
          </label>

          <label class="field">
            <span>Senha</span>
            <input
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="error('password') !== null"
            />
            @if (error('password')) {
              <small class="error">{{ error('password') }}</small>
            }
          </label>

          @if (serverError()) {
            <p id="login-form-error" class="error" role="alert">{{ serverError() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <p class="muted footer">
          Não tem conta?
          <a routerLink="/registrar-empresa">Cadastre sua empresa</a>
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      .auth-wrap {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: #f5f5f7;
      }
      .auth-card {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
      }
      h1 {
        margin: 0 0 0.25rem;
      }
      .muted {
        color: #6b7280;
        margin: 0 0 1.5rem;
      }
      form {
        display: grid;
        gap: 1rem;
      }
      .field {
        display: grid;
        gap: 0.35rem;
      }
      .field span {
        font-size: 0.875rem;
        font-weight: 500;
      }
      input {
        padding: 0.65rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 1rem;
      }
      input[aria-invalid='true'] {
        border-color: #dc2626;
      }
      .error {
        color: #dc2626;
        font-size: 0.85rem;
      }
      button[type='submit'] {
        padding: 0.75rem 1rem;
        border: 0;
        background: #2563eb;
        color: #fff;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.25rem;
      }
      button[type='submit']:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .footer {
        margin-top: 1.5rem;
        text-align: center;
      }
      a {
        color: #2563eb;
      }
    `,
  ],
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  error(name: 'email' | 'password'): string | null {
    return firstError(this.form.controls[name]);
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (me) => {
        this.submitting.set(false);
        void this.router.navigate([defaultRouteForUser(me)]);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message || 'Não foi possível entrar');
      },
    });
  }
}
