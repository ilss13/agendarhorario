import { FormControl } from '@angular/forms';
import { firstError, passwordStrengthValidator, slugValidator } from './form-error';

describe('passwordStrengthValidator', () => {
  it('accepts an empty value and a strong password', () => {
    expect(passwordStrengthValidator(new FormControl(''))).toBeNull();
    expect(passwordStrengthValidator(new FormControl(null))).toBeNull();
    expect(passwordStrengthValidator(new FormControl('Senha123'))).toBeNull();
  });

  it('lists every missing requirement', () => {
    expect(passwordStrengthValidator(new FormControl('abc'))).toEqual({
      password: { minlength: true, uppercase: true, digit: true },
    });
  });
});

describe('slugValidator', () => {
  it('accepts an empty value and a valid slug', () => {
    expect(slugValidator(new FormControl('  '))).toBeNull();
    expect(slugValidator(new FormControl(null))).toBeNull();
    expect(slugValidator(new FormControl('Salao-Centro'))).toBeNull();
  });

  it('rejects invalid characters and the length bounds', () => {
    expect(slugValidator(new FormControl('salão'))).toEqual({ slug: true });
    expect(slugValidator(new FormControl('ab'))).toEqual({ slugLength: true });
    expect(slugValidator(new FormControl('a'.repeat(61)))).toEqual({ slugLength: true });
  });
});

describe('firstError', () => {
  const control = (errors: Record<string, unknown>, touched = true): FormControl => {
    const field = new FormControl('');
    field.setErrors(errors);
    if (touched) field.markAsTouched();
    return field;
  };

  it('returns null when there is nothing to show', () => {
    expect(firstError(null)).toBeNull();
    expect(firstError(undefined)).toBeNull();
    expect(firstError(new FormControl(''))).toBeNull();
    const dirty = new FormControl('');
    dirty.setErrors({ required: true });
    dirty.markAsDirty();
    expect(firstError(dirty)).toBe('Campo obrigatório');
  });

  it('maps each known error to a message', () => {
    expect(firstError(control({ required: true }))).toBe('Campo obrigatório');
    expect(firstError(control({ email: true }))).toBe('Email inválido');
    expect(firstError(control({ pattern: true }))).toBe('Formato inválido');
    expect(firstError(control({ minlength: { requiredLength: 2 } }))).toBe(
      'Mínimo de 2 caracteres',
    );
    expect(firstError(control({ maxlength: { requiredLength: 10 } }))).toBe(
      'Máximo de 10 caracteres',
    );
    expect(firstError(control({ password: { minlength: true } }))).toBe(
      'Senha deve ter pelo menos 8 caracteres',
    );
    expect(firstError(control({ password: { uppercase: true } }))).toContain('maiúscula');
    expect(firstError(control({ password: { lowercase: true } }))).toContain('minúscula');
    expect(firstError(control({ password: { digit: true } }))).toContain('número');
    expect(firstError(control({ password: {} }))).toBe('Valor inválido');
    expect(firstError(control({ slug: true }))).toContain('hífens');
    expect(firstError(control({ slugLength: true }))).toContain('3 e 60');
    expect(firstError(control({ serverError: 'Slug em uso' }))).toBe('Slug em uso');
    expect(firstError(control({ unknown: true }))).toBe('Valor inválido');
  });
});
