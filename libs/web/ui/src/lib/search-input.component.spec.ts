import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { SearchInputComponent } from './search-input.component';

describe('SearchInputComponent', () => {
  it('debounces input and clears immediately', fakeAsync(() => {
    const fixture = TestBed.createComponent(SearchInputComponent);
    fixture.componentInstance.initialValue = null;
    fixture.componentInstance.clear();
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    fixture.componentInstance.onInput('cor');
    fixture.componentInstance.onInput('corte');
    expect(emitted).toEqual([]);
    tick(300);
    expect(emitted).toEqual(['corte']);

    fixture.componentInstance.clear();
    expect(fixture.componentInstance.value()).toBe('');
    expect(emitted).toEqual(['corte', '']);
    tick(300);
  }));

  it('starts from an initial value and shows the clear button', () => {
    const fixture = TestBed.createComponent(SearchInputComponent);
    fixture.componentInstance.initialValue = null;
    expect(fixture.componentInstance.value()).toBe('');
    fixture.componentInstance.initialValue = 'corte';
    expect(fixture.componentInstance.value()).toBe('corte');
    fixture.componentInstance.onInput('corte');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.clear')).not.toBeNull();
    fixture.componentInstance.clear();
  });
});
