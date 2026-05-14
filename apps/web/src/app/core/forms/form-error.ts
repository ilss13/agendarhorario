import { AbstractControl, ValidationErrors } from '@angular/forms';

export const passwordStrengthValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as string | null;
  if (!value) return null;
  const failures: Record<string, true> = {};
  if (value.length < 8) failures['minlength'] = true;
  if (!/[A-Z]/.test(value)) failures['uppercase'] = true;
  if (!/[a-z]/.test(value)) failures['lowercase'] = true;
  if (!/[0-9]/.test(value)) failures['digit'] = true;
  return Object.keys(failures).length ? { password: failures } : null;
};

export const slugValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value as string | null)?.trim().toLowerCase() ?? '';
  if (!value) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return { slug: true };
  if (value.length < 3 || value.length > 60) return { slugLength: true };
  return null;
};

export const firstError = (control: AbstractControl | null | undefined): string | null => {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;
  const errors = control.errors;
  if (errors['required']) return 'Campo obrigatório';
  if (errors['email']) return 'Email inválido';
  if (errors['minlength']) {
    const requiredLength = (errors['minlength'] as { requiredLength: number }).requiredLength;
    return `Mínimo de ${requiredLength} caracteres`;
  }
  if (errors['maxlength']) {
    const requiredLength = (errors['maxlength'] as { requiredLength: number }).requiredLength;
    return `Máximo de ${requiredLength} caracteres`;
  }
  if (errors['password']) {
    const flags = errors['password'] as Record<string, boolean>;
    if (flags['minlength']) return 'Senha deve ter pelo menos 8 caracteres';
    if (flags['uppercase']) return 'Senha deve conter ao menos uma letra maiúscula';
    if (flags['lowercase']) return 'Senha deve conter ao menos uma letra minúscula';
    if (flags['digit']) return 'Senha deve conter ao menos um número';
  }
  if (errors['slug']) return 'Use apenas letras minúsculas, números e hífens';
  if (errors['slugLength']) return 'Slug deve ter entre 3 e 60 caracteres';
  if (errors['serverError']) return errors['serverError'] as string;
  return 'Valor inválido';
};
