import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { MyAppointmentDto } from '@agendarhorario/contracts';
import { MyAppointmentsApi } from '@agendarhorario/web-data-access';
import { AuthService } from '../../core/auth/auth.service';
import { MyAppointmentsListPageComponent } from './my-appointments-list.page';

const appointment: MyAppointmentDto = {
  id: '11111111-1111-4111-8111-111111111111',
  companyName: 'Salao',
  companySlug: 'salao',
  serviceId: '22222222-2222-4222-8222-222222222222',
  serviceName: 'Corte',
  startsAt: '2026-09-22T13:00:00.000Z',
  endsAt: '2026-09-22T13:30:00.000Z',
  status: 'CONFIRMED',
};

describe('MyAppointmentsListPageComponent', () => {
  const list = jest.fn();
  const logout = jest.fn();

  const setup = (): MyAppointmentsListPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MyAppointmentsListPageComponent],
      providers: [
        provideRouter([]),
        { provide: MyAppointmentsApi, useValue: { list } },
        { provide: AuthService, useValue: { logout } },
      ],
    });
    return TestBed.createComponent(MyAppointmentsListPageComponent).componentInstance;
  };

  beforeEach(() => {
    list.mockReset();
    logout.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });

  it('lists upcoming appointments and ignores the same range', () => {
    list.mockReturnValue(of({ items: [appointment], total: 1 }));
    const page = setup();
    expect(page.items()).toEqual([appointment]);
    page.setRange('upcoming');
    expect(list).toHaveBeenCalledTimes(1);
    page.setRange('past');
    expect(list).toHaveBeenCalledWith({ range: 'past', page: 1, pageSize: 50 });
    expect(page.formatDate(appointment.startsAt)).toContain('2026');
    expect(page.statusLabel('PENDING')).toBe('Aguardando');
    expect(page.statusLabel('CONFIRMED')).toBe('Confirmado');
    expect(page.statusLabel('CANCELLED')).toBe('Cancelado');
    expect(page.statusLabel('COMPLETED')).toBe('Concluído');
    expect(page.statusLabel('NO_SHOW')).toBe('Não compareceu');
  });

  it('shows a load error and logs out even when the request fails', () => {
    list.mockReturnValue(throwError(() => ({})));
    const page = setup();
    expect(page.loadError()).toBe('Erro ao carregar');
    logout.mockReturnValue(of(undefined));
    page.onLogout();
    logout.mockReturnValue(throwError(() => new Error('no')));
    page.onLogout();
    expect(window.location.href).toBe('/login');
  });
});
