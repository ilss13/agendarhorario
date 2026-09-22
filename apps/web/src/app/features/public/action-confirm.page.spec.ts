import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { ActionPreviewDto } from '@agendarhorario/contracts';
import { ActionTokenApi } from '@agendarhorario/web-data-access';
import { ActionConfirmPageComponent } from './action-confirm.page';

const preview = (status: ActionPreviewDto['appointment']['status']): ActionPreviewDto => ({
  kind: 'CONFIRM',
  alreadyConsumed: false,
  appointment: {
    id: '11111111-1111-4111-8111-111111111111',
    serviceName: 'Corte',
    companyName: 'Salao',
    customerName: 'Ana',
    startsAt: '2026-09-22T13:00:00.000Z',
    endsAt: '2026-09-22T13:30:00.000Z',
    status,
  },
});

describe('ActionConfirmPageComponent', () => {
  const api = { preview: jest.fn(), confirm: jest.fn() };

  const setup = (token: string | null): ActionConfirmPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ActionConfirmPageComponent],
      providers: [
        { provide: ActionTokenApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(token ? { token } : {}) } },
        },
      ],
    });
    return TestBed.createComponent(ActionConfirmPageComponent).componentInstance;
  };

  beforeEach(() => {
    api.preview.mockReset();
    api.confirm.mockReset();
  });

  it('requires a token and surfaces a preview failure', () => {
    const missing = setup(null);
    expect(missing.loadError()).toBe('Token ausente');
    missing.submit();
    expect(api.confirm).not.toHaveBeenCalled();

    api.preview.mockReturnValue(throwError(() => ({})));
    const page = setup('tok');
    expect(page.loadError()).toBe('Não foi possível carregar o link');
  });

  it('confirms the action and labels every status', () => {
    api.preview.mockReturnValue(of(preview('PENDING')));
    const page = setup('tok');
    expect(page.formatDate(preview('PENDING').appointment.startsAt)).toContain('2026');
    expect(page.statusLabel('PENDING')).toBe('Aguardando confirmação');
    expect(page.statusLabel('CONFIRMED')).toBe('Confirmado');
    expect(page.statusLabel('CANCELLED')).toBe('Cancelado');
    expect(page.statusLabel('COMPLETED')).toBe('Concluído');
    expect(page.statusLabel('NO_SHOW')).toBe('Não compareceu');

    api.confirm.mockReturnValue(of({ status: 'CONFIRMED' as const }));
    page.submit();
    expect(page.result()?.status).toBe('CONFIRMED');

    api.confirm.mockReturnValue(throwError(() => ({})));
    page.submit();
    expect(page.submitError()).toBe('Não foi possível processar a ação');
  });
});
