import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { ServiceDto } from '@agendarhorario/contracts';
import { ServicesApi } from '@agendarhorario/web-data-access';
import { ServicesListPageComponent } from './services-list.page';

const service = (id: string, name: string): ServiceDto => ({
  id,
  name,
  description: null,
  durationMinutes: 30,
  bufferMinutes: 0,
  price: 10,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('ServicesListPageComponent', () => {
  const list = jest.fn();
  const remove = jest.fn();

  const setup = (): ServicesListPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ServicesListPageComponent],
      providers: [provideRouter([]), { provide: ServicesApi, useValue: { list, remove } }],
    });
    return TestBed.createComponent(ServicesListPageComponent).componentInstance;
  };

  beforeEach(() => {
    list.mockReset();
    remove.mockReset();
  });

  it('loads, searches and clears the query', () => {
    list.mockReturnValue(
      of({ items: [service('11111111-1111-4111-8111-111111111111', 'Corte')], total: 1 }),
    );
    const page = setup();
    expect(page.items()).toHaveLength(1);
    page.onSearch('  corte  ');
    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 50, q: 'corte' });
    page.clearSearch();
    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 50, q: undefined });

    list.mockReturnValue(throwError(() => ({})));
    page.reload();
    expect(page.loadError()).toBe('Erro ao carregar serviços');
  });

  it('opens the form and rolls back a failed removal', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    list.mockReturnValue(of({ items: [service(id, 'Corte')], total: 1 }));
    const page = setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.goNew();
    expect(navigate).toHaveBeenCalledWith(['/dashboard/servicos/novo']);

    page.confirmRemove();
    expect(remove).not.toHaveBeenCalled();

    page.askRemove(service(id, 'Corte'));
    remove.mockReturnValue(throwError(() => new Error('no')));
    page.confirmRemove();
    expect(page.items()).toHaveLength(1);
    expect(remove).toHaveBeenCalledWith(id);
  });
});
