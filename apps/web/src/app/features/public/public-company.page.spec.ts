import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { PublicCompanyDto } from '@agendarhorario/contracts';
import { PublicCompaniesApi } from '@agendarhorario/web-data-access';
import { PublicCompanyPageComponent } from './public-company.page';

const company: PublicCompanyDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Salao',
  slug: 'salao',
  phone: null,
  timezone: 'America/Sao_Paulo',
  logoUrl: null,
  status: 'AVAILABLE',
  statusReason: null,
  services: [],
  businessHours: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '12:00',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      dayOfWeek: 1,
      startTime: '14:00',
      endTime: '18:00',
    },
  ],
};

describe('PublicCompanyPageComponent', () => {
  const getBySlug = jest.fn();

  const setup = (slug: string | null): PublicCompanyPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PublicCompanyPageComponent],
      providers: [
        provideRouter([]),
        { provide: PublicCompaniesApi, useValue: { getBySlug } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(slug ? { slug } : {}) } },
        },
      ],
    });
    return TestBed.createComponent(PublicCompanyPageComponent).componentInstance;
  };

  beforeEach(() => getBySlug.mockReset());

  it('does nothing without a slug', () => {
    const page = setup(null);
    expect(getBySlug).not.toHaveBeenCalled();
    expect(page.loading()).toBe(false);
  });

  it('loads the company and formats the day hours', () => {
    getBySlug.mockReturnValue(of(company));
    const page = setup('salao');
    expect(page.company()?.name).toBe('Salao');
    expect(page.hoursForDay(company, 1)).toBe('09:00–12:00, 14:00–18:00');
    expect(page.hoursForDay(company, 0)).toBe('Fechado');

    getBySlug.mockReturnValue(throwError(() => ({})));
    page.load();
    expect(page.loadError()).toBe('Erro ao carregar');
  });
});
