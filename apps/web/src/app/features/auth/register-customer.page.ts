import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { defaultRouteForUser } from '../../core/auth/redirect-after-login';
import { firstError, passwordStrengthValidator } from '../../core/forms/form-error';
import type { ApiError } from '../../core/http/error.interceptor';

@Component({
  selector: 'app-register-customer-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-wrap">
      <section class="auth-card">
        <h1>Criar conta de cliente</h1>
        <p class="muted">Acompanhe seus agendamentos em todas as empresas.</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <label class="field">
            <span>Nome</span>
            <input type="text" formControlName="name" maxlength="120" />
            @if (error('name')) {
              <small class="error">{{ error('name') }}</small>
            }
          </label>

          <label class="field">
            <span>Email</span>
            <input type="email" formControlName="email" autocomplete="email" />
            @if (error('email')) {
              <small class="error">{{ error('email') }}</small>
            }
          </label>

          <label class="field">
            <span>Telefone (com DDI)</span>
            <input type="tel" formControlName="phone" placeholder="+5511999999999" />
            @if (error('phone')) {
              <small class="error">{{ error('phone') }}</small>
            }
            <small class="hint">
              Importante para encontrar agendamentos feitos antes da conta existir.
            </small>
          </label>

          <label class="field">
            <span>Senha</span>
            <input type="password" formControlName="password" autocomplete="new-password" />
            @if (error('password')) {
              <small class="error">{{ error('password') }}</small>
            }
            <small class="hint">
              Mínimo 8 caracteres, com 1 maiúscula, 1 minúscula e 1 número.
            </small>
          </label>

          @if (serverError()) {
            <p class="error" role="alert">{{ serverError() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Criando conta...' : 'Criar conta' }}
          </button>
        </form>

        <p class="muted footer">
          Já tem conta?
          <a routerLink="/login">Entrar</a>
        </p>
        <p class="muted footer">
          É uma empresa?
          <a routerLink="/registrar-empresa">Cadastrar empresa</a>
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
        max-width: 460px;
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
      .error {
        color: #dc2626;
        font-size: 0.85rem;
      }
      .hint {
        color: #6b7280;
        font-size: 0.8rem;
      }
      button[type='submit'] {
        padding: 0.75rem 1rem;
        border: 0;
        background: #2563eb;
        color: #fff;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
      }
      button[type='submit']:disabled {
        opacity: 0.55;
      }
      .footer {
        margin-top: 0.5rem;
        text-align: center;
      }
      a {
        color: #2563eb;
      }
    `,
  ],
})
export class RegisterCustomerPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    phone: this.fb.control<string | null>(null, [Validators.pattern(/^\+?\d{10,15}$/)]),
    password: ['', [Validators.required, passwordStrengthValidator]],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  error(name: 'name' | 'email' | 'phone' | 'password'): string | null {
    return firstError(this.form.controls[name]);
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.auth
      .registerCustomer({
        name: value.name,
        email: value.email,
        phone: value.phone ?? undefined,
        password: value.password,
      })
      .subscribe({
        next: (me) => {
          this.submitting.set(false);
          void this.router.navigate([defaultRouteForUser(me)]);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(err.message || 'Não foi possível cadastrar');
        },
      });
  }
}
