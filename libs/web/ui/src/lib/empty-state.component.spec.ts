import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [EmptyStateComponent] }));

  it('renders title', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Tudo limpo');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Tudo limpo');
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('renders the description and emits the action', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    const action = jest.fn();
    fixture.componentInstance.action.subscribe(action);
    fixture.componentInstance.description = 'Nenhum horário';
    fixture.componentInstance.actionLabel = 'Criar';
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(fixture.nativeElement.textContent).toContain('Nenhum horário');
    expect(action).toHaveBeenCalled();
  });
});
