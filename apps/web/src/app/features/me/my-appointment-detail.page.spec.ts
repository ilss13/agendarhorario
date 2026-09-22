import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { MyAppointmentDto } from '@agendarhorario/contracts';
import { MyAppointmentsApi, PublicCompaniesApi } from '@agendarhorario/web-data-access';
import { MyAppointmentDetailPageComponent } from './my-appointment-detail.page';

const appointment = (status: MyAppointmentDto['status'], startsAt: string): MyAppointmentDto => ({
  id: '11111111-1111-4111-8111-111111111111',
  companyName: 'Salao',
  companySlug: 'salao',
  serviceId: '22222222-2222-4222-8222-222222222222',
  serviceName: 'Corte',
  startsAt,
  endsAt: startsAt,
  status,
});

const future = '2099-01-02T13:00:00.000Z';

describe('MyAppointmentDetailPageComponent', () => {
  const api = { getById: jest.fn(), reschedule: jest.fn(), cancel: jest.fn() };
  const publicApi = { availability: jest.fn() };

  const setup = (id: string | null): MyAppointmentDetailPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MyAppointmentDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: MyAppointmentsApi, useValue: api },
        { provide: PublicCompaniesApi, useValue: publicApi },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    return TestBed.createComponent(MyAppointmentDetailPageComponent).componentInstance;
  };

  beforeEach(() => {
    api.getById.mockReset();
    api.reschedule.mockReset();
    api.cancel.mockReset();
    publicApi.availability.mockReset();
  });

  it('does nothing without an id', () => {
    const page = setup(null);
    expect(api.getById).not.toHaveBeenCalled();
    page.startReschedule();
    page.confirmReschedule();
    page.doCancel();
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('decides when the customer can still act', () => {
    api.getById.mockReturnValue(of(appointment('CONFIRMED', future)));
    const page = setup(appointment('CONFIRMED', future).id);
    expect(page.canAct(appointment('CANCELLED', future))).toBe(false);
    expect(page.canAct(appointment('COMPLETED', future))).toBe(false);
    expect(page.canAct(appointment('NO_SHOW', future))).toBe(false);
    expect(page.canAct(appointment('PENDING', '2000-01-01T00:00:00.000Z'))).toBe(false);
    expect(page.canAct(appointment('PENDING', future))).toBe(true);
    expect(page.formatShortDate('2026-09-22')).toBe('22/09/2026');
    expect(page.formatDate(future)).toContain('2099');
    expect(page.statusLabel('PENDING')).toBe('Aguardando confirmação');
    expect(page.statusLabel('CONFIRMED')).toBe('Confirmado');
    expect(page.statusLabel('CANCELLED')).toBe('Cancelado');
    expect(page.statusLabel('COMPLETED')).toBe('Concluído');
    expect(page.statusLabel('NO_SHOW')).toBe('Não compareceu');
  });

  it('reschedules the selected slot and cancels the appointment', () => {
    api.getById.mockReturnValue(of(appointment('CONFIRMED', future)));
    const page = setup(appointment('CONFIRMED', future).id);
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const slot = { start: future, end: future };
    publicApi.availability.mockReturnValue(
      of({ serviceId: appointment('CONFIRMED', future).serviceId, days: [] }),
    );
    page.startReschedule();
    page.selectSlot(slot);
    api.reschedule.mockReturnValue(of(appointment('CONFIRMED', future)));
    page.confirmReschedule();
    expect(navigate).toHaveBeenCalledWith([
      '/me/agendamentos',
      appointment('CONFIRMED', future).id,
    ]);
    expect(page.rescheduling()).toBe(false);

    page.startReschedule();
    page.cancelReschedule();
    expect(page.selectedSlot()).toBeNull();

    publicApi.availability.mockReturnValue(throwError(() => ({})));
    page.startReschedule();
    expect(page.actionError()).toBe('Não foi possível carregar horários');

    api.reschedule.mockReturnValue(throwError(() => ({})));
    page.selectSlot(slot);
    page.confirmReschedule();
    expect(page.actionError()).toBe('Não foi possível remarcar');

    page.askCancel();
    expect(page.confirmingCancel()).toBe(true);
    api.cancel.mockReturnValue(of(appointment('CANCELLED', future)));
    page.doCancel();
    expect(page.appointment()?.status).toBe('CANCELLED');

    api.cancel.mockReturnValue(throwError(() => ({})));
    page.doCancel();
    expect(page.actionError()).toBe('Não foi possível cancelar');

    api.getById.mockReturnValue(throwError(() => ({})));
    page.load();
    expect(page.loadError()).toBe('Não foi possível carregar');
  });
});
