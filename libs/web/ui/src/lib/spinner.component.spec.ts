import { TestBed } from '@angular/core/testing';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  it('exposes a loading status with the default size', () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(spinner.getAttribute('aria-label')).toBe('Carregando');
    expect(fixture.componentInstance.size).toBe(24);
  });
});
