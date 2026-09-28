import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { CompanyAppointmentDto } from '@agendarhorario/contracts';
import { CompanyAppointmentsApi } from '@agendarhorario/web-data-access';
import { AgendaPageComponent } from './agenda.page';

const confirmed: CompanyAppointmentDto = {
  id: '11111111-1111-4111-8111-111111111111',
  customerName: 'Camila',
  customerPhone: '+5511999999999',
  serviceName: 'Corte',
  startsAt: '2026-09-23T13:00:00.000Z',
  endsAt: '2026-09-23T13:45:00.000Z',
  status: 'CONFIRMED',
};

describe('AgendaPageComponent', () => {
  const api = { list: jest.fn() };

  const setup = (): AgendaPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AgendaPageComponent],
      providers: [{ provide: CompanyAppointmentsApi, useValue: api }],
    });
    return TestBed.createComponent(AgendaPageComponent).componentInstance;
  };

  beforeEach(() => api.list.mockReset());

  it('loads the day and labels a client confirmation in green', () => {
    api.list.mockReturnValue(of({ date: '2026-09-23', items: [confirmed] }));
    const page = setup();
    expect(page.items()).toEqual([confirmed]);
    expect(page.badge(confirmed)).toEqual({ label: 'Confirmado', tone: 'confirmed' });
    expect(page.clock(confirmed.startsAt)).toBe('10:00');
    expect(page.phone(confirmed.customerPhone)).toContain('99999');
  });

  it('clears the list when the agenda request fails and ignores a bad date', () => {
    api.list.mockReturnValue(throwError(() => ({})));
    const page = setup();
    expect(page.loadError()).toBe('Não foi possível carregar a agenda');
    expect(page.items()).toEqual([]);
    page.onDate('amanha');
    page.onDateInput(new Event('change'));
    expect(api.list).toHaveBeenCalledTimes(1);

    api.list.mockReturnValue(of({ date: '2026-09-24', items: [] }));
    page.onDate('2026-09-24');
    expect(page.date()).toBe('2026-09-24');
    expect(page.phone(null)).toBeNull();
    expect(page.badge({ ...confirmed, status: 'PENDING' }).tone).toBe('pending');
  });
});
