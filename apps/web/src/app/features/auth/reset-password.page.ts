import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/error.interceptor';
import { firstError, passwordStrengthValidator } from '../../core/forms/form-error';
import { AuthShellComponent } from './auth-shell.component';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value as string;
  const confirm = group.get('confirmPassword')?.value as string;
  if (!confirm || password === confirm) return null;
  return { mismatch: true };
};

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss',
})
export class ResetPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly oobCode = this.route.snapshot.queryParamMap.get('oobCode') ?? '';

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly submitting = signal(false);
  readonly done = signal(false);
  readonly serverError = signal<string | null>(null);

  error(name: 'password' | 'confirmPassword'): string | null {
    const field = firstError(this.form.controls[name]);
    if (field) return field;
    const confirm = this.form.controls.confirmPassword;
    if (
      name === 'confirmPassword' &&
      this.form.hasError('mismatch') &&
      (confirm.touched || confirm.dirty)
    ) {
      return 'As senhas não coincidem';
    }
    return null;
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (!this.oobCode || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth
      .resetPassword({ oobCode: this.oobCode, password: this.form.controls.password.getRawValue() })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.done.set(true);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);
          this.serverError.set(err.message || 'Não foi possível redefinir a senha');
        },
      });
  }
}
