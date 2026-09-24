import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { PublicCompanyDto } from '@agendarhorario/contracts';
import { PublicCompaniesApi, PublicVerificationApi } from '@agendarhorario/web-data-access';
import { BookingFlowPageComponent } from './booking-flow.page';

const serviceId = '22222222-2222-4222-8222-222222222222';

const company: PublicCompanyDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Salao',
  slug: 'salao',
  phone: null,
  timezone: 'America/Sao_Paulo',
  logoUrl: null,
  status: 'AVAILABLE',
  statusReason: null,
  businessHours: [],
  services: [
    {
      id: serviceId,
      name: 'Corte',
      description: null,
      durationMinutes: 30,
      bufferMinutes: 0,
      price: 40,
    },
  ],
};

const slot = { start: '2026-09-22T13:00:00.000Z', end: '2026-09-22T13:30:00.000Z' };

describe('BookingFlowPageComponent', () => {
  const companies = {
    getBySlug: jest.fn(),
    availability: jest.fn(),
    createAppointment: jest.fn(),
  };
  const verification = { request: jest.fn(), confirm: jest.fn() };

  const setup = (
    params: Record<string, string> = { slug: 'salao', serviceId },
  ): BookingFlowPageComponent & { destroy: () => void } => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BookingFlowPageComponent],
      providers: [
        provideRouter([]),
        { provide: PublicCompaniesApi, useValue: companies },
        { provide: PublicVerificationApi, useValue: verification },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(params) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(BookingFlowPageComponent);
    fixture.detectChanges();
    return Object.assign(fixture.componentInstance, { destroy: () => fixture.destroy() });
  };

  const fillContact = (page: BookingFlowPageComponent): void => {
    page.contactForm.setValue({
      name: 'Ana',
      email: 'ana@example.com',
      phone: '(11) 98888-7777',
      notes: null,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    companies.getBySlug.mockReturnValue(of(company));
    companies.availability.mockReturnValue(
      of({ serviceId, days: [{ date: '2026-09-22', slots: [] }] }),
    );
  });

  it('ignores a route without slug or service', () => {
    const page = setup({});
    expect(companies.getBySlug).not.toHaveBeenCalled();
    expect(page.service()).toBeNull();
    expect(page.stepTitle()).toBe('Escolha um horário');
    expect(page.confirmedDateLabel()).toBe('');
    expect(page.resendLabel()).toBe('Reenviar código');
  });

  it('loads slots, masks the phone and requests a code', () => {
    const page = setup();
    expect(page.service()?.name).toBe('Corte');
    expect(page.allDaysEmpty(page.availability()!)).toBe(true);
    expect(page.formatDate('2026-09-22')).toBe('22/09/2026');
    page.goToData();
    expect(page.step()).toBe('slot');

    page.selectSlot(slot);
    page.goToData();
    expect(page.step()).toBe('data');
    expect(page.stepTitle()).toBe('Seus dados');
    expect(page.confirmedDateLabel()).toContain('2026');

    const input = document.createElement('input');
    input.value = '11988887777';
    page.onPhoneInput({ target: input } as unknown as Event);
    expect(page.contactForm.controls.phone.value).toBe('(11) 98888-7777');
    input.value = '11';
    page.onPhoneInput({ target: input } as unknown as Event);
    expect(input.value).toBe('(11');
    input.value = '1198888';
    page.onPhoneInput({ target: input } as unknown as Event);
    expect(input.value).toBe('(11) 98888');
    input.value = '';
    page.onPhoneInput({ target: input } as unknown as Event);
    expect(input.value).toBe('');
    input.value = '5511988887777';
    page.onPhoneInput({ target: input } as unknown as Event);
    expect(input.value).toBe('(11) 98888-7777');

    page.contactForm.controls.phone.markAsTouched();
    page.contactForm.controls.phone.setValue('119');
    expect(page.cf('phone')).toBe('Use o formato (11) 99999-9999');
    page.contactForm.controls.name.markAsTouched();
    expect(page.cf('name')).toBe('Campo obrigatório');

    page.onRequestOtp();
    expect(page.step()).toBe('data');

    fillContact(page);
    verification.request.mockReturnValue(of({ channel: 'SMS' as const, target: '+5511988887777' }));
    page.onRequestOtp();
    expect(page.step()).toBe('otp');
    expect(page.stepTitle()).toBe('Confirme com o código');
    expect(page.verificationChannel()).toBe('SMS');

    page.resendCooldownSeconds.set(10);
    page.onRequestOtp();
    page.onResendOtp();
    expect(verification.request).toHaveBeenCalledTimes(1);
  });

  it('confirms the code, reuses a token and describes server errors', fakeAsync(() => {
    const page = setup();
    page.selectSlot(slot);
    fillContact(page);
    verification.request.mockReturnValue(
      of({ channel: 'EMAIL' as const, target: 'ana@example.com' }),
    );
    page.onRequestOtp();
    expect(page.resendLabel()).toBe('Reenviar código (60s)');
    tick(1000);
    expect(page.resendCooldownSeconds()).toBe(59);
    tick(59_000);
    expect(page.resendCooldownSeconds()).toBe(0);
    expect(page.resendLabel()).toBe('Reenviar código');

    page.verificationTarget.set(null);
    page.otpForm.controls.code.setValue('123456');
    page.onConfirmOtp();
    expect(page.confirming()).toBe(false);

    page.verificationTarget.set('ana@example.com');
    verification.confirm.mockReturnValue(of({ verificationToken: 'ver-token' }));
    companies.createAppointment.mockReturnValue(of({ id: 'apt' }));
    page.onConfirmOtp();
    expect(page.step()).toBe('done');
    expect(page.stepTitle()).toBe('');

    page.step.set('otp');
    page.verificationToken.set('existing');
    page.onConfirmOtp();
    expect(companies.createAppointment).toHaveBeenCalledTimes(2);

    page.selectedSlot.set(null);
    page.onConfirmOtp();
    expect(companies.createAppointment).toHaveBeenCalledTimes(2);

    page.selectSlot(slot);
    page.verificationToken.set(null);
    page.verificationTarget.set(null);
    page.onConfirmOtp();
    expect(page.confirming()).toBe(false);

    page.verificationTarget.set('ana@example.com');
    verification.confirm.mockReturnValue(
      throwError(() => ({ status: 500, message: 'Internal Server Error' })),
    );
    page.onConfirmOtp();
    expect(page.otpError()).toContain('Tente novamente');

    verification.confirm.mockReturnValue(throwError(() => ({ status: 400 })));
    page.onConfirmOtp();
    expect(page.otpError()).toBe('Código inválido');

    page.otpForm.controls.code.setValue('12');
    page.onConfirmOtp();
    expect(page.otpFieldError()).toBe('Formato inválido');

    verification.request.mockReturnValue(throwError(() => ({ status: 429, message: 'calma' })));
    page.sending.set(false);
    page.onResendOtp();
    expect(page.otpError()).toBe('calma');

    companies.createAppointment.mockReturnValue(throwError(() => ({ status: 500 })));
    page.verificationToken.set('existing');
    page.otpForm.controls.code.setValue('123456');
    page.onConfirmOtp();
    expect(page.otpError()).toContain('Tente novamente');

    companies.getBySlug.mockReturnValue(throwError(() => ({ status: 404 })));
    page.load();
    expect(page.loadError()).toBe('Erro ao carregar');
    companies.getBySlug.mockReturnValue(of(company));
    companies.availability.mockReturnValue(throwError(() => ({ status: 503, message: 'down' })));
    page.load();
    expect(page.loadError()).toBe('down');

    page.sending.set(true);
    expect(page.resendLabel()).toBe('Reenviando...');
    page.confirming.set(true);
    page.onResendOtp();
    page.resendCooldownSeconds.set(5);
    page.destroy();
  }));

  it('opens the schedule when the same service is chosen again', () => {
    const page = setup();
    page.step.set('service');
    page.chooseService(serviceId);
    expect(page.step()).toBe('slot');
    expect(companies.availability).toHaveBeenCalledTimes(1);
  });

  it('reloads slots for another service and ignores a suspended company', () => {
    const page = setup();
    const other = '33333333-3333-4333-8333-333333333333';
    page.company.set({
      ...company,
      services: [...company.services, { ...company.services[0], id: other, name: 'Barba' }],
    });
    page.selectSlot(slot);
    page.chooseService(other);
    expect(page.service()?.name).toBe('Barba');
    expect(page.selectedSlot()).toBeNull();
    expect(companies.availability).toHaveBeenCalledTimes(2);

    page.company.set({ ...page.company()!, status: 'SUSPENDED' });
    page.chooseService(serviceId);
    expect(page.serviceId()).toBe(other);
  });
});
