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

  it('sorts plans and clears them when the catalog fails', () => {
    plans.mockReturnValue(of([plan('super', 2), plan('basico', 1)]));
    const page = setup();
    expect(page.plans().map((item) => item.code)).toEqual(['basico', 'super']);
    expect(page.loadingPlans()).toBe(false);
    expect(page.copyOf(plan('basico', 1))?.features.length).toBeGreaterThan(0);
    expect(
      page.copyOf({ ...plan('basico', 1), code: 'inexistente' } as unknown as PlanDto),
    ).toBeUndefined();
    expect(page.userHome()).toBe('/login');

    plans.mockReturnValue(throwError(() => new Error('offline')));
    const failed = setup();
    expect(failed.plans()).toEqual([]);
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
});
