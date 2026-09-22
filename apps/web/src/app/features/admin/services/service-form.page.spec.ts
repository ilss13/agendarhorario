import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { ServiceDto } from '@agendarhorario/contracts';
import { ServicesApi } from '@agendarhorario/web-data-access';
import { ServiceFormPageComponent } from './service-form.page';

const service: ServiceDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Corte',
  description: 'Curto',
  durationMinutes: 40,
  bufferMinutes: 10,
  price: 50,
  active: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ServiceFormPageComponent', () => {
  const api = { get: jest.fn(), create: jest.fn(), update: jest.fn() };

  const setup = (id: string | null): ServiceFormPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ServiceFormPageComponent],
      providers: [
        provideRouter([]),
        { provide: ServicesApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    return TestBed.createComponent(ServiceFormPageComponent).componentInstance;
  };

  beforeEach(() => {
    api.get.mockReset();
    api.create.mockReset();
    api.update.mockReset();
  });

  it('creates a service and returns to the list', () => {
    const page = setup(null);
    expect(page.isEdit()).toBe(false);
    page.onSubmit();
    expect(page.error('name')).toBe('Campo obrigatório');

    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.form.setValue({
      name: 'Corte',
      description: null,
      durationMinutes: 30,
      bufferMinutes: 0,
      price: 0,
      active: true,
    });
    api.create.mockReturnValue(of(service));
    page.onSubmit();
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
    expect(navigate).toHaveBeenCalledWith(['/dashboard/servicos']);

    api.create.mockReturnValue(throwError(() => ({})));
    page.onSubmit();
    expect(page.serverError()).toBe('Erro ao salvar');
    page.back();
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('loads an existing service and updates it', () => {
    api.get.mockReturnValue(of(service));
    const page = setup(service.id);
    expect(page.isEdit()).toBe(true);
    expect(page.form.getRawValue().name).toBe('Corte');
    api.update.mockReturnValue(of(service));
    page.onSubmit();
    expect(api.update).toHaveBeenCalledWith(service.id, expect.objectContaining({ name: 'Corte' }));

    api.get.mockReturnValue(throwError(() => ({})));
    const missing = setup(service.id);
    expect(missing.loadError()).toBe('Serviço não encontrado');
  });
});
