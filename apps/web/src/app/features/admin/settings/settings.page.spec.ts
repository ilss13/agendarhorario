import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { CompanyDto } from '@agendarhorario/contracts';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import { SettingsPageComponent } from './settings.page';

const company: CompanyDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Salao',
  slug: 'salao',
  phone: '11999999999',
  email: 'salao@example.com',
  timezone: 'America/Sao_Paulo',
  logoUrl: null,
  notificationPrefs: { email: true, secondaryChannel: 'SMS' },
};

describe('SettingsPageComponent', () => {
  const get = jest.fn();
  const update = jest.fn();

  const setup = (): SettingsPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [provideRouter([]), { provide: CompaniesApi, useValue: { get, update } }],
    });
    return TestBed.createComponent(SettingsPageComponent).componentInstance;
  };

  beforeEach(() => {
    get.mockReset();
    update.mockReset();
  });

  it('fills the form from the company and reports a load failure', () => {
    get.mockReturnValue(of(company));
    const page = setup();
    expect(page.form.getRawValue().slug).toBe('salao');
    expect(page.loadedOnce()).toBe(true);

    get.mockReturnValue(throwError(() => ({})));
    const failed = setup();
    expect(failed.loadError()).toBe('Erro ao carregar empresa');
  });

  it('does not save an invalid form', () => {
    get.mockReturnValue(of(company));
    const page = setup();
    page.form.controls.name.setValue('');
    page.onSubmit();
    expect(update).not.toHaveBeenCalled();
    expect(page.error('name')).toBe('Campo obrigatório');
  });

  it('saves the company and shows the API error', () => {
    get.mockReturnValue(of(company));
    const page = setup();
    update.mockReturnValue(of({ ...company, name: 'Salao Novo' }));
    page.form.controls.name.setValue('Salao Novo');
    page.form.controls.phone.setValue(null);
    page.onSubmit();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, name: 'Salao Novo' }),
    );
    expect(page.success()).toBe(true);
    expect(page.form.getRawValue().name).toBe('Salao Novo');

    update.mockReturnValue(throwError(() => ({})));
    page.onSubmit();
    expect(page.serverError()).toBe('Não foi possível salvar');
  });
});
