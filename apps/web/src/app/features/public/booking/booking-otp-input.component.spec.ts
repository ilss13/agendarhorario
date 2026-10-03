import { TestBed } from '@angular/core/testing';
import { BookingOtpInputComponent } from './booking-otp-input.component';

describe('BookingOtpInputComponent', () => {
  const setup = (code = '') => {
    const fixture = TestBed.createComponent(BookingOtpInputComponent);
    fixture.componentRef.setInput('code', code);
    fixture.detectChanges();
    return fixture;
  };

  it('keeps only digits and blanks the rest of the code', () => {
    const fixture = setup('12a');
    expect(fixture.componentInstance.chars()).toEqual(['1', '2', '', '', '', '']);
    fixture.componentRef.setInput('code', '');
    fixture.detectChanges();
    expect(fixture.componentInstance.chars().every((char) => char === '')).toBe(true);
  });

  it('emits the next code when a digit is typed', () => {
    const fixture = setup('');
    const emitted: string[] = [];
    fixture.componentInstance.codeChange.subscribe((code) => emitted.push(code));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '7';
    input.dispatchEvent(new Event('input'));
    expect(emitted).toEqual(['7']);
  });

  it('ignores keys other than backspace and shortens the code on backspace', () => {
    const fixture = setup('12');
    const emitted: string[] = [];
    fixture.componentInstance.codeChange.subscribe((code) => emitted.push(code));
    const second = fixture.nativeElement.querySelectorAll('input')[1] as HTMLInputElement;
    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', cancelable: true }));
    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }));
    expect(emitted).toEqual(['1']);
  });

  it('fills the code from pasted text and ignores a missing clipboard', () => {
    const fixture = setup('');
    const emitted: string[] = [];
    fixture.componentInstance.codeChange.subscribe((code) => emitted.push(code));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    const paste = new Event('paste', { cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => '123456' } });
    input.dispatchEvent(paste);

    const empty = new Event('paste', { cancelable: true });
    input.dispatchEvent(empty);

    expect(emitted).toEqual(['123456', '']);
  });
});
