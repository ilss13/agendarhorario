import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { MeResponse, PlanDto } from '@agendarhorario/contracts';
import { BillingApi } from '@agendarhorario/web-data-access';
import { AuthService } from '../../core/auth/auth.service';
import { LandingPageComponent } from './landing.page';

const plan = (code: PlanDto['code'], sortOrder: number): PlanDto => ({
  id: '11111111-1111-4111-8111-111111111111',
  code,
  name: code,
  priceBrl: 10,
  monthlyAppointmentLimit: 25,
  stripePriceId: 'price',
  sortOrder,
  trialDays: 14,
});

const user = (role: MeResponse['role']): MeResponse => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  name: 'Ana',
  role,
  companyId: null,
  emailVerified: true,
  phoneVerified: false,
});

describe('LandingPageComponent', () => {
  const current = signal<MeResponse | null>(null);
  const plans = jest.fn();

  const setup = (): LandingPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [
        provideRouter([]),
        { provide: BillingApi, useValue: { plans } },
        {
          provide: AuthService,
          useValue: { user: current, isAuthenticated: () => current() !== null },
        },
      ],
    });
    return TestBed.createComponent(LandingPageComponent).componentInstance;
  };

  beforeEach(() => {
    current.set(null);
    plans.mockReset();
  });

  it('shows the commercial catalog and replaces it when the API responds', () => {
    plans.mockReturnValue(of([plan('super', 2), plan('basico', 1)]));
    const page = setup();
    expect(page.plans().map((item) => [item.code, item.priceBrl])).toEqual([
      ['basico', 10],
      ['super', 10],
    ]);
    expect(page.plans()[0]?.features.length).toBeGreaterThan(0);
    expect(page.userHome()).toBe('/login');

    plans.mockReturnValue(throwError(() => new Error('offline')));
    const failed = setup();
    expect(failed.plans().map((item) => item.priceBrl)).toEqual([39.9, 79.9, 149.9, 249.9]);
  });

  it('routes owners, customers and guests differently', () => {
    plans.mockReturnValue(of([]));
    current.set(user('STAFF'));
    const staff = setup();
    const staffRouter = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(staff.signupLink('medio')).toEqual(['/dashboard/assinatura']);
    expect(staff.userHome()).toBe('/dashboard');
    staff.startSignup('medio');
    expect(staffRouter).toHaveBeenCalledWith(['/dashboard/assinatura'], {
      queryParams: { plan: 'medio' },
    });

    current.set(user('CUSTOMER'));
    const customer = setup();
    const customerRouter = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(customer.signupLink('basico')).toBe('/me/agendamentos');
    customer.startSignup('basico');
    expect(customerRouter).toHaveBeenCalledWith(['/me/agendamentos']);

    current.set(null);
    const guest = setup();
    const guestRouter = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(guest.signupLink('basico')).toEqual(['/registrar-empresa']);
    guest.startSignup('grande');
    expect(guestRouter).toHaveBeenCalledWith(['/registrar-empresa'], {
      queryParams: { plan: 'grande' },
    });
  });

  it('sends a valid lead email to company registration and rejects a blank one', () => {
    plans.mockReturnValue(of([]));
    const page = setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'email';
    input.value = 'ana@studio.com';
    form.append(input);

    const event = new Event('submit');
    Object.defineProperty(event, 'target', { value: form });
    page.submitLead(event, 'hero');
    expect(page.leadError()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/registrar-empresa'], {
      queryParams: { email: 'ana@studio.com' },
    });

    input.value = 'sem-arroba';
    page.submitLead(event, 'final');
    expect(page.leadError()).toBe('final');
  });
});
