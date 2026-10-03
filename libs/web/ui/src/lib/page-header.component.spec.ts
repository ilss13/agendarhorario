import { TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  it('renders the title without a subtitle', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentInstance.title = 'Agenda';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Agenda');
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('renders the subtitle when it is provided', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentInstance.title = 'Agenda';
    fixture.componentInstance.subtitle = 'Hoje';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hoje');
  });
});
