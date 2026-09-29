import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { CompanyAppointmentDto } from '@agendarhorario/contracts';
import {
  BusinessExceptionsApi,
  BusinessHoursApi,
  CompanyAppointmentsApi,
} from '@agendarhorario/web-data-access';
import { todayInAgenda } from './agenda-display';
import { agendaWeekContaining, agendaWeekMonths } from './agenda-week';
import { AgendaWeekPageComponent } from './agenda-week.page';

const confirmed: CompanyAppointmentDto = {
  id: '11111111-1111-4111-8111-111111111111',
  customerName: 'Ana',
  customerPhone: '+5511999999999',
  serviceName: 'Sombrancelha',
  startsAt: '2026-09-29T13:00:00.000Z',
  endsAt: '2026-09-29T13:30:00.000Z',
  status: 'CONFIRMED',
};

describe('AgendaWeekPageComponent', () => {
  const api = { listMonth: jest.fn() };
  const hoursApi = { list: jest.fn() };
  const exceptionsApi = { list: jest.fn() };

  const setup = (): AgendaWeekPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AgendaWeekPageComponent],
      providers: [
        provideRouter([]),
        { provide: CompanyAppointmentsApi, useValue: api },
        { provide: BusinessHoursApi, useValue: hoursApi },
        { provide: BusinessExceptionsApi, useValue: exceptionsApi },
      ],
    });
    return TestBed.createComponent(AgendaWeekPageComponent).componentInstance;
  };

  beforeEach(() => {
    api.listMonth.mockReset();
    hoursApi.list.mockReset();
    exceptionsApi.list.mockReset();
  });

  it('loads the week months and keeps today selected when hours fail', () => {
    const today = todayInAgenda();
    const days = agendaWeekContaining(today);
    api.listMonth.mockImplementation((month: string) =>
      of({
        month,
        items: month === today.slice(0, 7) ? [confirmed] : [],
      }),
    );
    hoursApi.list.mockReturnValue(throwError(() => ({})));
    exceptionsApi.list.mockReturnValue(throwError(() => ({})));
    const page = setup();
    expect(api.listMonth.mock.calls.map((call) => call[0])).toEqual(agendaWeekMonths(days));
    expect(exceptionsApi.list).toHaveBeenCalledWith({ from: days[0], to: days[6] });
    expect(page.selected()).toBe(today);
    expect(page.days().every((day) => day.open)).toBe(true);
    expect(page.days()).toHaveLength(7);
    page.select('nao-e-um-dia');
    expect(page.selected()).toBe(today);
    page.select(days[0]);
    expect(page.selected()).toBe(days[0]);
    expect(page.dayLabel()).not.toBe('');
    expect(page.phone(confirmed.customerPhone)).toContain('99999');
    expect(page.badge(confirmed).tone).toBe('confirmed');
  });

  it('clears the week when the agenda request fails and marks a closed weekday', () => {
    api.listMonth.mockReturnValue(throwError(() => ({})));
    hoursApi.list.mockReturnValue(
      of([{ id: 'h', dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }]),
    );
    exceptionsApi.list.mockReturnValue(of([]));
    const page = setup();
    expect(page.loadError()).toBe('Não foi possível carregar a agenda');
    expect(page.items()).toEqual([]);
    expect(page.stats()).toEqual({ total: 0, pending: 0, next: null });

    api.listMonth.mockImplementation((month: string) => of({ month, items: [] }));
    hoursApi.list.mockReturnValue(
      of([{ id: 'h', dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }]),
    );
    page.load();
    const sunday = page.days().find((day) => day.label === 'Dom');
    expect(sunday?.open).toBe(false);
    if (sunday) {
      page.select(sunday.iso);
      expect(page.emptyMessage()).toContain('Fechado');
      expect(page.dayLabelFor(sunday)).toContain('fechado');
    }
    expect(page.phone(null)).toBeNull();
  });
});
