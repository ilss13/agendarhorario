import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { MeResponse } from '@agendarhorario/contracts';
import { AuthService } from '../../core/auth/auth.service';
import { RegisterCustomerPageComponent } from './register-customer.page';

const customer: MeResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  name: 'Ana',
  role: 'CUSTOMER',
  companyId: null,
  emailVerified: false,
  phoneVerified: false,
};

describe('RegisterCustomerPageComponent', () => {
  const registerCustomer = jest.fn();

  const setup = (): RegisterCustomerPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RegisterCustomerPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { registerCustomer } }],
    });
    return TestBed.createComponent(RegisterCustomerPageComponent).componentInstance;
  };

  beforeEach(() => registerCustomer.mockReset());

  it('stops on an invalid form', () => {
    const page = setup();
    page.onSubmit();
    expect(page.error('name')).toBe('Campo obrigatório');
    expect(registerCustomer).not.toHaveBeenCalled();
  });

  it('omits an empty phone and navigates to the customer home', () => {
    const page = setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.form.setValue({ name: 'Ana', email: customer.email, phone: null, password: 'Senha123' });
    registerCustomer.mockReturnValue(of(customer));
    page.onSubmit();
    expect(registerCustomer).toHaveBeenCalledWith({
      name: 'Ana',
      email: customer.email,
      phone: undefined,
      password: 'Senha123',
    });
    expect(navigate).toHaveBeenCalledWith(['/me/agendamentos']);
  });

  it('shows the API message when registration fails', () => {
    const page = setup();
    page.form.setValue({
      name: 'Ana',
      email: customer.email,
      phone: '+5511999999999',
      password: 'Senha123',
    });
    registerCustomer.mockReturnValue(throwError(() => ({})));
    page.onSubmit();
    expect(page.serverError()).toBe('Não foi possível cadastrar');
  });
});
