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
  templateUrl: './register-customer.page.html',
  styleUrl: './register-customer.page.scss',
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
