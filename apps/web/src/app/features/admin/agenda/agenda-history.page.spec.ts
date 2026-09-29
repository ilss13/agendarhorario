import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { CompanyAppointmentDto } from '@agendarhorario/contracts';
import { CompanyAppointmentsApi } from '@agendarhorario/web-data-access';
import { AgendaHistoryPageComponent } from './agenda-history.page';

const completed: CompanyAppointmentDto = {
  id: '11111111-1111-4111-8111-111111111111',
  customerName: 'Ana',
  customerPhone: '+5511999999999',
  serviceName: 'Corte',
  startsAt: '2026-09-14T12:00:00.000Z',
  endsAt: '2026-09-14T13:00:00.000Z',
  status: 'COMPLETED',
};

const pending: CompanyAppointmentDto = {
  ...completed,
  id: '22222222-2222-4222-8222-222222222222',
  status: 'PENDING',
};

describe('AgendaHistoryPageComponent', () => {
  const api = { listMonth: jest.fn() };

  const setup = (): AgendaHistoryPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AgendaHistoryPageComponent],
      providers: [provideRouter([]), { provide: CompanyAppointmentsApi, useValue: api }],
    });
    return TestBed.createComponent(AgendaHistoryPageComponent).componentInstance;
  };

  beforeEach(() => api.listMonth.mockReset());

  it('loads the current month and opens a finished appointment', () => {
    api.listMonth.mockReturnValue(of({ month: '2026-09', items: [completed, pending] }));
    const page = setup();
    expect(api.listMonth).toHaveBeenCalledWith(page.month());
    expect(page.summary().completed).toBe(1);
    expect(page.groups()[0]?.items).toEqual([completed]);
    expect(page.canGoForward()).toBe(false);
    page.shift(1);
    expect(page.month()).toBe(page.todayMonth);
    page.open(pending);
    expect(page.detail()).toBeNull();
    page.open(completed);
    expect(page.detail()).toEqual(completed);
    expect(page.when(completed)).toContain('2026');
    expect(page.phone(completed.customerPhone)).toContain('99999');
    expect(page.badge(completed).label).toBe('Concluído');
    page.close();
    expect(page.detail()).toBeNull();
  });

  it('clears the history when the request fails and ignores a bad shift', () => {
    api.listMonth.mockReturnValue(throwError(() => ({})));
    const page = setup();
    expect(page.loadError()).toBe('Não foi possível carregar o histórico');
    expect(page.items()).toEqual([]);
    expect(page.summary()).toEqual({ total: 0, completed: 0, cancelled: 0, noShow: 0 });
    page.shift(1.5);
    expect(api.listMonth).toHaveBeenCalledTimes(1);
    expect(page.phone(null)).toBe('—');
    expect(page.initial(' ana ')).toBe('A');
    expect(page.clock('hora')).toBe('');
  });
});
