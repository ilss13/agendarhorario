import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { RegisterCompanyPageComponent } from './register-company.page';

describe('RegisterCompanyPageComponent', () => {
  const registerCompany = jest.fn();

  const setup = (plan: string | null = null): RegisterCompanyPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RegisterCompanyPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { registerCompany } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(plan ? { plan } : {}) } },
        },
      ],
    });
    return TestBed.createComponent(RegisterCompanyPageComponent).componentInstance;
  };

  const fill = (page: RegisterCompanyPageComponent): void => {
    page.form.setValue({
      companyName: 'Salao',
      slug: 'salao',
      ownerName: 'Ana',
      email: 'ana@example.com',
      password: 'Senha123',
    });
  };

  beforeEach(() => registerCompany.mockReset());

  it('stops when the form is invalid', () => {
    const page = setup();
    page.onSubmit();
    expect(registerCompany).not.toHaveBeenCalled();
    expect(page.error('companyName')).toBe('Campo obrigatório');
  });

  it('opens the subscription page when a plan was preselected', () => {
    const page = setup('medio');
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(page);
    registerCompany.mockReturnValue(of({}));
    page.onSubmit();
    expect(navigate).toHaveBeenCalledWith(['/dashboard/assinatura'], {
      queryParams: { plan: 'medio' },
    });
    expect(page.submitting()).toBe(false);
  });

  it('goes to the dashboard and applies field errors from the API', () => {
    const page = setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fill(page);
    registerCompany.mockReturnValue(of({}));
    page.onSubmit();
    expect(navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: undefined });

    registerCompany.mockReturnValue(
      throwError(() => ({
        message: '',
        fieldErrors: { slug: ['em uso'], missing: [], unknown: ['x'] },
      })),
    );
    page.onSubmit();
    expect(page.form.controls.slug.errors).toEqual({ serverError: 'em uso' });
    expect(page.serverError()).toBe('Não foi possível cadastrar');
  });
});
