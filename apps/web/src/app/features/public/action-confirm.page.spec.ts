import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { ActionPreviewDto } from '@agendarhorario/contracts';
import { ActionTokenApi } from '@agendarhorario/web-data-access';
import { ActionConfirmPageComponent } from './action-confirm.page';

const preview = (status: ActionPreviewDto['appointment']['status']): ActionPreviewDto => ({
  kind: 'CONFIRM',
  alreadyConsumed: false,
  expiresAt: '2026-09-24T13:00:00.000Z',
  appointment: {
    id: '11111111-1111-4111-8111-111111111111',
    serviceName: 'Corte',
    companyName: 'Salao',
    companyPhone: null,
    logoUrl: null,
    customerName: 'Ana Souza',
    durationMinutes: 30,
    price: 40,
    startsAt: '2026-09-23T13:00:00.000Z',
    endsAt: '2026-09-23T13:30:00.000Z',
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
    const fixture = TestBed.createComponent(ActionConfirmPageComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    api.preview.mockReset();
    api.confirm.mockReset();
    URL.createObjectURL = jest.fn(() => 'blob:agendamento');
    URL.revokeObjectURL = jest.fn();
  });

  it('requires a token and surfaces a preview failure', () => {
    const missing = setup(null);
    expect(missing.loadError()).toBe('Token ausente');
    missing.downloadCalendar();
    missing.submit('CONFIRM');
    expect(api.confirm).not.toHaveBeenCalled();

    api.preview.mockReturnValue(throwError(() => ({})));
    const page = setup('tok');
    expect(page.loadError()).toBe('Não foi possível carregar o link');
  });

  it('confirms the visit and can cancel from the same link', () => {
    api.preview.mockReturnValue(of(preview('PENDING')));
    const page = setup('tok');
    expect(page.phase()).toBe('confirm');
    expect(page.intro()).toContain('Ana');
    expect(page.dateLabel()).toBe('Qua, 23 de setembro');
    expect(page.timeLabel()).toBe('10:00 · 30 min');
    expect(page.priceLabel()).toContain('40');

    api.confirm.mockReturnValue(of({ status: 'CONFIRMED' as const }));
    page.submit('CONFIRM');
    expect(page.phase()).toBe('confirmed');
    expect(api.confirm).toHaveBeenCalledWith('tok', 'CONFIRM');

    api.confirm.mockReturnValue(throwError(() => ({})));
    page.submit('CANCEL');
    expect(page.submitError()).toBe('Não foi possível processar a ação');
    expect(api.confirm).toHaveBeenCalledWith('tok', 'CANCEL');

    page.resultStatus.set('CONFIRMED');
    page.downloadCalendar();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('shows a cancellation link and skips a calendar without a preview', () => {
    api.preview.mockReturnValue(
      of({
        ...preview('CANCELLED'),
        kind: 'CANCEL',
        alreadyConsumed: true,
        appointment: { ...preview('CANCELLED').appointment, companyPhone: '+5511988887777' },
      }),
    );
    const page = setup('tok');
    expect(page.phase()).toBe('cancelled');
    expect(page.phoneLabel()).toContain('8888');
    page.downloadCalendar();
  });
});
