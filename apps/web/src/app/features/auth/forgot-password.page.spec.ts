import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ForgotPasswordPageComponent } from './forgot-password.page';

describe('ForgotPasswordPageComponent', () => {
  const requestPasswordReset = jest.fn();

  const setup = (): ForgotPasswordPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ForgotPasswordPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { requestPasswordReset } }],
    });
    return TestBed.createComponent(ForgotPasswordPageComponent).componentInstance;
  };

  beforeEach(() => requestPasswordReset.mockReset());

  it('stops when the email is invalid', () => {
    const page = setup();
    page.onSubmit();
    expect(requestPasswordReset).not.toHaveBeenCalled();
    expect(page.error('email')).toBe('Campo obrigatório');
  });

  it('marks the request as sent and surfaces an API failure', () => {
    const page = setup();
    page.form.setValue({ email: 'ana@example.com' });
    requestPasswordReset.mockReturnValue(of({ sent: true }));
    page.onSubmit();
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'ana@example.com' });
    expect(page.sent()).toBe(true);
    expect(page.submitting()).toBe(false);

    page.sent.set(false);
    requestPasswordReset.mockReturnValue(throwError(() => ({ message: '' })));
    page.onSubmit();
    expect(page.serverError()).toBe('Não foi possível enviar o e-mail');
  });
});
