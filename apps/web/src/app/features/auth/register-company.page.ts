import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/error.interceptor';
import { firstError, passwordStrengthValidator, slugValidator } from '../../core/forms/form-error';

@Component({
  selector: 'app-register-company-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register-company.page.html',
  styleUrl: './register-company.page.scss',
})
export class RegisterCompanyPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly preselectedPlan = this.route.snapshot.queryParamMap.get('plan');

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
          const target = this.preselectedPlan ? ['/dashboard/assinatura'] : ['/dashboard'];
          void this.router.navigate(target, {
            queryParams: this.preselectedPlan ? { plan: this.preselectedPlan } : undefined,
          });
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
