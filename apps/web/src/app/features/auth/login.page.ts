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
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
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
