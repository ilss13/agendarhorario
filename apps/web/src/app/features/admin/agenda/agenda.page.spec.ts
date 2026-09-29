import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { CompanyAppointmentDto } from '@agendarhorario/contracts';
import { CompanyAppointmentsApi } from '@agendarhorario/web-data-access';
import { AgendaPageComponent } from './agenda.page';

const confirmed: CompanyAppointmentDto = {
  id: '11111111-1111-4111-8111-111111111111',
  customerName: 'Camila',
  customerPhone: null,
  serviceName: 'Corte',
  startsAt: '2026-09-21T13:00:00.000Z',
  endsAt: '2026-09-21T14:00:00.000Z',
  status: 'CONFIRMED',
};

describe('AgendaPageComponent', () => {
  const api = { listMonth: jest.fn() };

  const setup = (): AgendaPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AgendaPageComponent],
      providers: [provideRouter([]), { provide: CompanyAppointmentsApi, useValue: api }],
    });
    return TestBed.createComponent(AgendaPageComponent).componentInstance;
  };

  beforeEach(() => api.listMonth.mockReset());

  it('loads the visible month and opens a day from the calendar', () => {
    api.listMonth.mockReturnValue(of({ month: '2026-09', items: [confirmed] }));
    const page = setup();
    expect(api.listMonth).toHaveBeenCalledWith(page.month());
    expect(page.summary().confirmed).toBe(1);
    expect(page.cells().length).toBeGreaterThan(27);
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.openDay('2026-09-21');
    expect(navigate).toHaveBeenCalledWith(['/dashboard/agenda', '2026-09-21']);
    page.shift(1);
    expect(api.listMonth).toHaveBeenCalledTimes(2);
  });

  it('clears the month when the request fails and ignores a bad shift', () => {
    api.listMonth.mockReturnValue(throwError(() => ({})));
    const page = setup();
    expect(page.loadError()).toBe('Não foi possível carregar a agenda');
    expect(page.items()).toEqual([]);
    const month = page.month();
    page.shift(1.5);
    expect(page.month()).toBe(month);
    expect(api.listMonth).toHaveBeenCalledTimes(1);
    expect(page.count('2026-09-21')).toBe(0);
  });
});
