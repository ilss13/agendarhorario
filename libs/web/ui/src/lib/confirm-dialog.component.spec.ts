import { TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  it('emits confirm and cancel when the dialog is open', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentInstance.open = true;
    fixture.componentInstance.title = 'Excluir';
    fixture.detectChanges();

    const confirmed = jest.fn();
    const cancelled = jest.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.cancelled.subscribe(cancelled);

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();
    buttons[1].click();
    fixture.nativeElement.querySelector('.backdrop').click();

    expect(cancelled).toHaveBeenCalledTimes(2);
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Excluir');
  });

  it('hides the dialog while it is closed', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dialog')).toBeNull();
  });
});
