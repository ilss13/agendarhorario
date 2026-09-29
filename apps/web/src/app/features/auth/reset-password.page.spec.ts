import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ResetPasswordPageComponent } from './reset-password.page';

describe('ResetPasswordPageComponent', () => {
  const resetPassword = jest.fn();

  const setup = (oobCode: string | null = 'a'.repeat(12)): ResetPasswordPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ResetPasswordPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { resetPassword } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(oobCode ? { oobCode } : {}) } },
        },
      ],
    });
    return TestBed.createComponent(ResetPasswordPageComponent).componentInstance;
  };

  beforeEach(() => resetPassword.mockReset());

  it('ignores a submit when the link has no code', () => {
    const page = setup(null);
    page.form.setValue({ password: 'Senha123', confirmPassword: 'Senha123' });
    page.onSubmit();
    expect(resetPassword).not.toHaveBeenCalled();
    expect(page.oobCode).toBe('');
  });

  it('rejects a weak password and a confirmation that does not match', () => {
    const page = setup();
    page.form.setValue({ password: 'fraca', confirmPassword: 'fraca' });
    page.form.markAllAsTouched();
    expect(page.error('password')).toBe('Senha deve ter pelo menos 8 caracteres');

    page.form.setValue({ password: 'Senha123', confirmPassword: 'Senha124' });
    page.form.controls.confirmPassword.markAsTouched();
    expect(page.error('confirmPassword')).toBe('As senhas não coincidem');
    page.onSubmit();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('saves the new password and surfaces an expired link', () => {
    const page = setup();
    page.form.setValue({ password: 'Senha123', confirmPassword: 'Senha123' });
    resetPassword.mockReturnValue(of({ reset: true }));
    page.onSubmit();
    expect(resetPassword).toHaveBeenCalledWith({ oobCode: 'a'.repeat(12), password: 'Senha123' });
    expect(page.done()).toBe(true);

    page.done.set(false);
    resetPassword.mockReturnValue(
      throwError(() => ({ message: 'Este link expirou. Peça um novo.' })),
    );
    page.onSubmit();
    expect(page.serverError()).toBe('Este link expirou. Peça um novo.');
    expect(page.submitting()).toBe(false);
  });
});
