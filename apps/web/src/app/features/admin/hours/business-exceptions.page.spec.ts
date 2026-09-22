import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { BusinessExceptionDto } from '@agendarhorario/contracts';
import { BusinessExceptionsApi } from '@agendarhorario/web-data-access';
import { BusinessExceptionsPageComponent } from './business-exceptions.page';

const item: BusinessExceptionDto = {
  id: '11111111-1111-4111-8111-111111111111',
  date: '2026-12-25',
  fullDay: true,
  startTime: null,
  endTime: null,
  reason: 'Natal',
};

describe('BusinessExceptionsPageComponent', () => {
  const api = { list: jest.fn(), create: jest.fn(), remove: jest.fn() };

  const setup = (): BusinessExceptionsPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BusinessExceptionsPageComponent],
      providers: [{ provide: BusinessExceptionsApi, useValue: api }],
    });
    return TestBed.createComponent(BusinessExceptionsPageComponent).componentInstance;
  };

  beforeEach(() => {
    api.list.mockReset();
    api.create.mockReset();
    api.remove.mockReset();
    api.list.mockReturnValue(of([item]));
  });

  it('formats dates and reports a failed load', () => {
    const page = setup();
    expect(page.formatDate('2026-12-25')).toBe('25/12/2026');
    expect(page.formatDate('')).toBe('');
    expect(page.items()).toEqual([item]);

    api.list.mockReturnValue(throwError(() => ({})));
    page.reload();
    expect(page.loadError()).toBe('Erro ao carregar exceções');
  });

  it('rejects an invalid form, a partial interval and an inverted interval', () => {
    const page = setup();
    page.form.controls.date.setValue('');
    page.onSubmit();
    expect(page.error('date')).toBe('Campo obrigatório');

    page.form.patchValue({ date: '2026-12-25', fullDay: false, startTime: null, endTime: null });
    page.onSubmit();
    expect(page.formError()).toBe('Informe início e fim');

    page.form.patchValue({ startTime: '18:00', endTime: '09:00' });
    page.onSubmit();
    expect(page.formError()).toBe('Fim deve ser após o início');

    page.form.patchValue({ date: 'ontem', fullDay: true, startTime: null, endTime: null });
    page.onSubmit();
    expect(page.formError()).toBeTruthy();
  });

  it('creates a full-day exception and restores a failed removal', () => {
    const page = setup();
    page.form.patchValue({ date: '2026-12-25', fullDay: true, reason: 'Natal' });
    api.create.mockReturnValue(of(item));
    page.onSubmit();
    expect(page.success()).toBe(true);
    expect(page.items()[0]).toEqual(item);

    api.create.mockReturnValue(throwError(() => ({})));
    page.form.patchValue({
      date: '2026-12-26',
      fullDay: false,
      startTime: '09:00',
      endTime: '12:00',
    });
    page.onSubmit();
    expect(page.formError()).toBe('Erro ao salvar');

    page.confirmRemove();
    expect(api.remove).not.toHaveBeenCalled();
    page.askRemove(item);
    api.remove.mockReturnValue(throwError(() => new Error('no')));
    page.confirmRemove();
    expect(api.list).toHaveBeenCalled();
  });
});
