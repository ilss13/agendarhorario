import { TestBed } from '@angular/core/testing';
import { BookingIdentityComponent } from './booking-identity.component';

describe('BookingIdentityComponent', () => {
  const setup = (phone: string | null = null, hoursLabel: string | null = null) => {
    const fixture = TestBed.createComponent(BookingIdentityComponent);
    fixture.componentRef.setInput('name', 'Salao Centro');
    fixture.componentRef.setInput('phone', phone);
    fixture.componentRef.setInput('hoursLabel', hoursLabel);
    fixture.detectChanges();
    return fixture;
  };

  it('falls back to initials when there is no logo', () => {
    const fixture = setup();
    expect(fixture.componentInstance.initials()).toBeTruthy();
    expect(fixture.componentInstance.mobileSubtitle()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Salao Centro');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('prefers the hours label and then the phone as subtitle', () => {
    const withHours = setup('+5511999999999', 'Seg a sex, 9h–18h');
    expect(withHours.componentInstance.mobileSubtitle()).toBe('Seg a sex, 9h–18h');
    expect(withHours.nativeElement.textContent).toContain(
      withHours.componentInstance.displayPhone(),
    );

    const withPhone = setup('+5511999999999', null);
    expect(withPhone.componentInstance.displayPhone()).toBeTruthy();
    expect(withPhone.componentInstance.mobileSubtitle()).toBe(
      withPhone.componentInstance.displayPhone(),
    );
  });

  it('switches to initials after the logo fails to load', () => {
    const fixture = setup();
    fixture.componentRef.setInput('logoUrl', 'https://cdn.example/logo.png');
    fixture.componentRef.setInput('stepLabel', 'Passo 1 de 3');
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.componentInstance.logoFailed()).toBe(true);
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Passo 1 de 3');
  });
});
