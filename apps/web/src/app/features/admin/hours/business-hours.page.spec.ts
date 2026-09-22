import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import type { BusinessHourDto } from '@agendarhorario/contracts';
import { BusinessHoursApi } from '@agendarhorario/web-data-access';
import { BusinessHoursPageComponent } from './business-hours.page';

const hour = (dayOfWeek: number, startTime: string, endTime: string): BusinessHourDto => ({
  id: '11111111-1111-4111-8111-111111111111',
  dayOfWeek,
  startTime,
  endTime,
});

describe('BusinessHoursPageComponent', () => {
  const api = { list: jest.fn(), replace: jest.fn() };

  const setup = (): BusinessHoursPageComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BusinessHoursPageComponent],
      providers: [{ provide: BusinessHoursApi, useValue: api }],
    });
    return TestBed.createComponent(BusinessHoursPageComponent).componentInstance;
  };

  beforeEach(() => {
    api.list.mockReset();
    api.replace.mockReset();
  });

  it('groups rows by day and describes row errors', () => {
    api.list.mockReturnValue(of([hour(1, '09:00', '12:00')]));
    const page = setup();
    expect(page.rowsForDay(1)).toHaveLength(1);
    expect(page.rowsForDay(0)).toEqual([]);
    expect(page.loadedOnce()).toBe(true);

    const group = page.rowsForDay(1)[0].group;
    expect(page.rowError(group, 'startTime')).toBeNull();
    group.get('startTime')?.setValue('');
    group.get('startTime')?.markAsTouched();
    expect(page.rowError(group, 'startTime')).toBe('Obrigatório');
    group.get('endTime')?.setErrors({ pattern: true });
    group.setErrors({ endBeforeStart: true });
    group.get('endTime')?.markAsTouched();
    expect(page.rowError(group, 'endTime')).toBe('Fim deve ser após início');
    group.setErrors(null);
    group.get('startTime')?.setErrors({ pattern: true });
    group.get('startTime')?.markAsTouched();
    expect(page.rowError(group, 'startTime')).toBe('Inválido');

    api.list.mockReturnValue(throwError(() => ({})));
    page.reload();
    expect(page.loadError()).toBe('Erro ao carregar horários');
  });

  it('blocks an invalid form and overlapping intervals', () => {
    api.list.mockReturnValue(of([]));
    const page = setup();
    page.addRow(1);
    const row = page.rowsForDay(1)[0].group;
    row.get('startTime')?.setValue('bad');
    page.onSubmit();
    expect(api.replace).not.toHaveBeenCalled();

    row.get('startTime')?.setValue('09:00');
    row.get('endTime')?.setValue('12:00');
    page.addRow(1);
    const second = page.rowsForDay(1)[1].group;
    second.get('startTime')?.setValue('11:00');
    second.get('endTime')?.setValue('13:00');
    page.onSubmit();
    expect(page.overlapError()).toContain('sobrepostos');

    page.removeRow(1);
    api.replace.mockReturnValue(of([hour(1, '09:00', '12:00')]));
    page.onSubmit();
    expect(page.success()).toBe(true);

    api.replace.mockReturnValue(throwError(() => ({})));
    page.onSubmit();
    expect(page.serverError()).toBe('Erro ao salvar');
    expect(page.rowsForDay(3)).toEqual([]);
  });

  it('ignores an incomplete range while validating order', () => {
    api.list.mockReturnValue(of([hour(2, '09:00', '18:00')]));
    const page = setup();
    const group = page.rowsForDay(2)[0].group as FormGroup;
    group.get('endTime')?.setValue('');
    group.updateValueAndValidity();
    expect(group.errors).toBeNull();
    group.get('startTime')?.setValue('ab:cd');
    group.get('endTime')?.setValue('18:00');
    group.updateValueAndValidity();
    expect(group.errors).toBeNull();
  });
});
