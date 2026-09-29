import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { CompanyDto } from '@agendarhorario/contracts';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import { AuthService } from '../../../core/auth/auth.service';
import { MorePageComponent } from './more.page';

const company: CompanyDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Salao',
  slug: 'salao',
  phone: null,
  email: null,
  timezone: 'America/Sao_Paulo',
  logoUrl: null,
  notificationPrefs: { email: true, secondaryChannel: 'NONE' },
};

describe('MorePageComponent', () => {
  const get = jest.fn();
  const logout = jest.fn();

  const setup = (): MorePageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MorePageComponent],
      providers: [
        provideRouter([]),
        { provide: CompaniesApi, useValue: { get } },
        {
          provide: AuthService,
          useValue: { user: () => ({ name: 'Igor' }), logout },
        },
      ],
    });
    return TestBed.createComponent(MorePageComponent).componentInstance;
  };

  beforeEach(() => {
    get.mockReset();
    logout.mockReset();
  });

  it('loads the company shown under the user name', () => {
    get.mockReturnValue(of(company));
    const page = setup();
    expect(page.company()?.slug).toBe('salao');
    expect(page.initial(' igor ')).toBe('I');
    expect(page.initial('   ')).toBe('·');
  });

  it('clears the company when loading fails and still logs out', () => {
    get.mockReturnValue(throwError(() => new Error('down')));
    const page = setup();
    expect(page.company()).toBeNull();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    logout.mockReturnValue(of(undefined));
    page.onLogout();
    logout.mockReturnValue(throwError(() => new Error('no')));
    page.onLogout();
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
