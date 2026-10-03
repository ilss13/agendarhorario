import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldComponent } from './form-field.component';

@Component({
  standalone: true,
  imports: [FormFieldComponent, ReactiveFormsModule],
  template: `
    <app-form-field
      label="Nome"
      [hint]="hint"
      [required]="required"
      [errorMessage]="errorMessage"
      [forceInvalid]="forceInvalid"
    >
      <input [formControl]="control" />
    </app-form-field>
  `,
})
class HostComponent {
  readonly control = new FormControl('', Validators.required);
  hint: string | null = 'Como aparece na agenda';
  required = true;
  errorMessage: string | null = null;
  forceInvalid: boolean | null | undefined = null;
}

describe('FormFieldComponent', () => {
  const setup = (): HostComponent & { element: HTMLElement; detect: () => void } => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return Object.assign(fixture.componentInstance, {
      element: fixture.nativeElement as HTMLElement,
      detect: () => fixture.detectChanges(),
    });
  };

  it('shows the hint while the field is untouched', () => {
    const host = setup();
    expect(host.element.textContent).toContain('Nome *');
    expect(host.element.querySelector('.hint')?.textContent).toContain('agenda');
    expect(host.element.querySelector('.error')).toBeNull();
  });

  it('marks the field invalid when the control was touched or dirtied', () => {
    const host = setup();
    host.control.markAsTouched();
    host.forceInvalid = true;
    host.detect();
    host.forceInvalid = false;
    host.detect();
    expect(host.element.querySelector('.hint')).toBeNull();
    expect(host.element.querySelector('[data-invalid="true"]')).not.toBeNull();

    host.control.setValue('Ana');
    host.forceInvalid = true;
    host.detect();
    host.forceInvalid = false;
    host.detect();
    expect(host.element.querySelector('[data-invalid="true"]')).toBeNull();

    host.control.setValue('');
    host.control.markAsUntouched();
    host.control.markAsDirty();
    host.forceInvalid = true;
    host.detect();
    host.forceInvalid = false;
    host.detect();
    expect(host.element.querySelector('[data-invalid="true"]')).not.toBeNull();
  });

  it('shows an explicit error and treats a missing control as valid', () => {
    const host = setup();
    host.hint = null;
    host.required = false;
    host.errorMessage = 'Informe o nome';
    host.forceInvalid = undefined;
    host.detect();
    expect(host.element.querySelector('.error')?.textContent).toContain('Informe o nome');

    const alone = TestBed.createComponent(FormFieldComponent);
    alone.componentRef.setInput('label', 'Email');
    alone.detectChanges();
    expect(alone.componentInstance.invalid()).toBe(false);
  });
});
