import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { FirebaseClientService } from '../../core/auth/firebase-client.service';
import { defaultRouteForUser } from '../../core/auth/redirect-after-login';
import { ApiError } from '../../core/http/error.interceptor';
import { firstError } from '../../core/forms/form-error';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <div class="art" aria-hidden="true"></div>

      <header class="top">
        <a class="brand" routerLink="/">Agendar Horário</a>
      </header>

      <main class="wrap">
        <section class="card">
          <h1>Acesse sua conta</h1>

          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            novalidate
            aria-describedby="login-form-error"
          >
            <label class="field">
              <span>E-mail</span>
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

            <div class="field">
              <div class="field-row">
                <label for="password">Senha</label>
              </div>
              <input
                id="password"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                [attr.aria-invalid]="error('password') !== null"
              />
              @if (error('password')) {
                <small class="error">{{ error('password') }}</small>
              }
            </div>

            <label class="remember">
              <input type="checkbox" formControlName="rememberMe" />
              Lembrar de mim neste dispositivo
            </label>

            @if (serverError()) {
              <p id="login-form-error" class="error" role="alert">{{ serverError() }}</p>
            }

            <button class="btn-primary" type="submit" [disabled]="form.invalid || busy()">
              {{ submitting() ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>

          @if (googleEnabled) {
            <div class="divider"><span>Ou faça login com</span></div>
            <button type="button" class="btn-google" (click)="onGoogle()" [disabled]="busy()">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.85-.07-1.67-.22-2.46H12v4.66h6.46c-.28 1.5-1.12 2.77-2.39 3.62v3h3.86c2.26-2.08 3.57-5.15 3.57-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.86-3c-1.07.72-2.45 1.15-4.09 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.09C3.24 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.25 14.28A7.22 7.22 0 0 1 4.87 12c0-.79.14-1.56.38-2.28V6.63H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.37l3.99-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.14 15.24 0 12 0 7.31 0 3.24 2.7 1.26 6.63l3.99 3.09C6.2 6.87 8.86 4.75 12 4.75z"
                />
              </svg>
              {{ googleSubmitting() ? 'Conectando...' : 'Google' }}
            </button>
          }

          <p class="signup">
            Começando agora?
            <a routerLink="/registrar-empresa">Crie uma conta</a>
          </p>
        </section>
      </main>

      <footer class="foot">
        <span>© Agendar Horário</span>
        <a routerLink="/">Início</a>
      </footer>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100dvh;
        color: #0a2540;
        overflow: hidden;
      }
      .shell {
        height: 100dvh;
        position: relative;
        overflow: hidden;
        background: #fbfbfc;
      }
      .art {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse 42% 70% at 100% 8%, rgba(99, 102, 241, 0.12) 0%, transparent 62%),
          radial-gradient(ellipse 36% 46% at 88% 92%, rgba(14, 165, 233, 0.08) 0%, transparent 58%),
          linear-gradient(180deg, #f7f8fb 0%, #fbfbfc 48%, #fff 100%);
      }
      .art::before {
        content: '';
        position: absolute;
        top: -12%;
        right: -8%;
        width: min(46vw, 520px);
        height: 78%;
        border-radius: 46% 34% 52% 28%;
        background:
          radial-gradient(circle at 32% 28%, rgba(165, 180, 252, 0.45), transparent 58%),
          radial-gradient(circle at 72% 62%, rgba(186, 230, 253, 0.35), transparent 55%),
          linear-gradient(155deg, rgba(224, 231, 255, 0.7) 0%, rgba(241, 245, 249, 0.2) 100%);
      }
      .art::after {
        content: '';
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 38%;
        background: linear-gradient(
          90deg,
          rgba(251, 251, 252, 0) 0%,
          rgba(238, 242, 255, 0.35) 100%
        );
      }
      .top {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        padding: 1.1rem 2rem;
      }
      .brand {
        font-weight: 800;
        letter-spacing: -0.03em;
        text-decoration: none;
        color: #0a2540;
        font-size: 1.15rem;
      }
      .wrap {
        position: relative;
        z-index: 1;
        height: 100dvh;
        display: grid;
        place-items: center;
        padding: 4.25rem 1.25rem 3.5rem;
        padding-right: 36%;
      }
      .card {
        position: relative;
        z-index: 3;
        width: 100%;
        max-width: 400px;
        background: #fff;
        border-radius: 1.15rem;
        padding: 1.35rem 1.5rem 1rem;
        box-shadow:
          0 1px 2px rgba(16, 24, 40, 0.04),
          0 18px 48px rgba(16, 24, 40, 0.08);
      }
      h1 {
        margin: 0 0 1.15rem;
        font-size: 1.28rem;
        letter-spacing: -0.03em;
        font-weight: 700;
      }
      form {
        display: grid;
        gap: 0.7rem;
      }
      .field {
        display: grid;
        gap: 0.4rem;
      }
      .field span,
      .field-row label {
        font-size: 0.84rem;
        font-weight: 600;
        color: #334155;
      }
      input[type='email'],
      input[type='password'] {
        width: 100%;
        padding: 0.62rem 0.85rem;
        border: 1px solid #d5d9e2;
        border-radius: 0.55rem;
        font-size: 1rem;
        background: #fff;
        transition:
          border-color 0.15s,
          box-shadow 0.15s;
      }
      input[type='email']:focus,
      input[type='password']:focus {
        outline: none;
        border-color: #635bff;
        box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.18);
      }
      input[aria-invalid='true'] {
        border-color: #dc2626;
      }
      .remember {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        font-size: 0.9rem;
        color: #334155;
        cursor: pointer;
      }
      .remember input {
        width: 1rem;
        height: 1rem;
        accent-color: #635bff;
      }
      .error {
        color: #dc2626;
        font-size: 0.82rem;
        margin: 0;
      }
      .btn-primary {
        padding: 0.78rem 1rem;
        border: 0;
        background: #7c6bff;
        color: #fff;
        border-radius: 0.55rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.15rem;
      }
      .btn-primary:hover:not(:disabled) {
        background: #6b5af5;
      }
      .btn-primary:disabled,
      .btn-google:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .divider {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 0.75rem;
        margin: 0.8rem 0 0.6rem;
        color: #94a3b8;
        font-size: 0.78rem;
      }
      .divider::before,
      .divider::after {
        content: '';
        height: 1px;
        background: #e5e7eb;
      }
      .btn-google {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.55rem;
        padding: 0.7rem 1rem;
        border: 1px solid #d5d9e2;
        background: #fff;
        border-radius: 0.55rem;
        font-weight: 600;
        color: #0a2540;
        cursor: pointer;
      }
      .btn-google:hover:not(:disabled) {
        background: #f8fafc;
      }
      .signup {
        margin: 0.85rem -1.5rem -1rem;
        padding: 0.75rem 1.5rem;
        text-align: center;
        background: #f8fafc;
        border-radius: 0 0 1.15rem 1.15rem;
        color: #64748b;
        font-size: 0.9rem;
      }
      .signup a {
        color: #4f46e5;
        font-weight: 600;
        text-decoration: none;
      }
      .foot {
        position: absolute;
        bottom: 0;
        left: 0;
        z-index: 2;
        display: flex;
        gap: 1rem;
        padding: 0 2rem 1.1rem;
        color: #64748b;
        font-size: 0.82rem;
      }
      .foot a {
        color: inherit;
        text-decoration: none;
      }
      @media (max-width: 900px) {
        .wrap {
          padding: 4.25rem 1.15rem 3.5rem;
        }
        .art::before {
          top: auto;
          bottom: -28%;
          right: -18%;
          width: 120%;
          height: 42%;
        }
        .art::after {
          width: 100%;
          background: linear-gradient(180deg, transparent 55%, rgba(247, 248, 251, 0.9) 100%);
        }
      }
      @media (max-height: 720px) {
        .wrap {
          padding-top: 3.5rem;
          padding-bottom: 2.75rem;
        }
        .card {
          padding: 1.15rem 1.35rem 0.85rem;
        }
        h1 {
          margin-bottom: 0.85rem;
        }
        form {
          gap: 0.55rem;
        }
        .divider {
          margin: 0.55rem 0 0.45rem;
        }
        .signup {
          margin: 0.7rem -1.35rem -0.85rem;
          padding: 0.65rem 1.35rem;
        }
      }
    `,
  ],
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseClientService);
  private readonly router = inject(Router);

  readonly googleEnabled = this.firebase.enabled;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [true],
  });

  readonly submitting = signal(false);
  readonly googleSubmitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly busy = computed(() => this.submitting() || this.googleSubmitting());

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

  onGoogle(): void {
    this.serverError.set(null);
    this.googleSubmitting.set(true);
    const rememberMe = this.form.controls.rememberMe.getRawValue();
    from(this.firebase.signInWithGoogle())
      .pipe(switchMap((idToken) => this.auth.loginWithGoogle({ idToken, rememberMe })))
      .subscribe({
        next: (me) => {
          this.googleSubmitting.set(false);
          void this.router.navigate([defaultRouteForUser(me)]);
        },
        error: (err: unknown) => {
          this.googleSubmitting.set(false);
          this.serverError.set(googleLoginMessage(err));
        },
      });
  }
}

const googleLoginMessage = (err: unknown): string => {
  const code = (err as { code?: string })?.code;
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Login com Google cancelado.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'Já existe uma conta com este e-mail. Entre com a senha.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Este domínio não está autorizado no Firebase.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'O login com Google ainda não está habilitado no Firebase.';
  }
  return (err as ApiError)?.message || 'Não foi possível entrar com o Google.';
};
