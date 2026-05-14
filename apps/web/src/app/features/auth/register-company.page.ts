import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/error.interceptor';
import { firstError, passwordStrengthValidator, slugValidator } from '../../core/forms/form-error';

@Component({
  selector: 'app-register-company-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-wrap">
      <section class="auth-card">
        <h1>Cadastrar empresa</h1>
        <p class="muted">Crie a conta da empresa e o usuário administrador.</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <fieldset>
            <legend>Empresa</legend>

            <label class="field">
              <span>Nome</span>
              <input type="text" formControlName="companyName" maxlength="120" />
              @if (error('companyName')) {
                <small class="error">{{ error('companyName') }}</small>
              }
            </label>

            <label class="field">
              <span>Slug (URL pública: /p/SEU-SLUG)</span>
              <input
                type="text"
                formControlName="slug"
                autocomplete="off"
                placeholder="minha-empresa"
              />
              @if (error('slug')) {
                <small class="error">{{ error('slug') }}</small>
              }
            </label>
          </fieldset>

          <fieldset>
            <legend>Administrador</legend>

            <label class="field">
              <span>Seu nome</span>
              <input type="text" formControlName="ownerName" maxlength="120" />
              @if (error('ownerName')) {
                <small class="error">{{ error('ownerName') }}</small>
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
              <span>Senha</span>
              <input type="password" formControlName="password" autocomplete="new-password" />
              @if (error('password')) {
                <small class="error">{{ error('password') }}</small>
              }
              <small class="hint">
                Mínimo 8 caracteres, com 1 maiúscula, 1 minúscula e 1 número.
              </small>
            </label>
          </fieldset>

          @if (serverError()) {
            <p class="error" role="alert">{{ serverError() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Cadastrando...' : 'Cadastrar empresa' }}
          </button>
        </form>

        <p class="muted footer">
          Já tem conta?
          <a routerLink="/login">Entrar</a>
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
        max-width: 520px;
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
      fieldset {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1rem;
        display: grid;
        gap: 0.75rem;
      }
      legend {
        padding: 0 0.4rem;
        font-weight: 600;
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
export class RegisterCompanyPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, slugValidator]],
    ownerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrengthValidator]],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  error(name: keyof RegisterCompanyPageComponent['form']['controls']): string | null {
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
      .registerCompany({
        company: { name: value.companyName, slug: value.slug },
        owner: { name: value.ownerName, email: value.email, password: value.password },
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigate(['/admin']);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          if (err.fieldErrors) {
            for (const [key, messages] of Object.entries(err.fieldErrors)) {
              const control = this.form.get(key);
              if (control && messages?.length) {
                control.setErrors({ serverError: messages[0] });
              }
            }
          }
          this.serverError.set(err.message || 'Não foi possível cadastrar');
        },
      });
  }
}
