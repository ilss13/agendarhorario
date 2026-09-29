import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { CompanyDto } from '@agendarhorario/contracts';
import { CompaniesApi } from '@agendarhorario/web-data-access';
import { DEFAULT_BRAND_ACCENT, DEFAULT_BRAND_PRIMARY } from './settings.logic';
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

  it('copies the public link and restores the label', fakeAsync(() => {
    get.mockReturnValue(of(company));
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const page = setup();
    expect(page.bookingLabel()).toContain('/p/salao');
    expect(page.form.controls.notificationPrefs.controls.email.disabled).toBe(true);

    page.copyLink();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/p/salao'));
    expect(page.copyLabel()).toBe('Copiado!');
    tick(1800);
    expect(page.copyLabel()).toBe('Copiar link');
  }));

  it('previews a png logo, rejects other files, and restores brand colors', () => {
    get.mockReturnValue(of(company));
    const page = setup();
    const createObjectURL = jest.fn().mockReturnValue('blob:logo');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    page.onLogoSelected(fileEvent(new File(['x'], 'foto.jpg', { type: 'image/jpeg' })));
    expect(page.logoError()).toBe('Envie um arquivo PNG ou SVG');
    expect(page.hasLogo()).toBe(false);

    page.onLogoSelected(fileEvent(new File(['x'], 'logo.png', { type: 'image/png' })));
    expect(page.hasLogo()).toBe(true);
    expect(page.logoLabel()).toBe('logo.png');

    page.primaryColor.set('#112233');
    page.resetColors();
    expect(page.primaryColor()).toBe(DEFAULT_BRAND_PRIMARY);
    expect(page.accentColor()).toBe(DEFAULT_BRAND_ACCENT);

    page.removeLogo();
    expect(page.hasLogo()).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:logo');
  });
});

const fileEvent = (file: File): Event =>
  ({ target: { files: [file], value: 'logo.png' } }) as unknown as Event;
