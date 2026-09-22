import type { Appointment } from '../appointments/appointment.entity';
import type { Company } from '../companies/company.entity';
import type { Customer } from '../customers/customer.entity';
import type { Service } from '../services/service.entity';
import type { NotificationJobKind } from './notifications.constants';
import { renderTemplate } from './templates';

describe('renderTemplate', () => {
  const ctxBase = {
    appointment: {
      startsAt: new Date('2026-06-15T13:00:00.000Z'),
    } as Appointment,
    company: {
      name: 'Salão & Co',
      timezone: 'America/Sao_Paulo',
    } as Company,
    service: {
      name: 'Corte <Premium>',
    } as Service,
    customer: {
      name: "Maria O'Neil",
    } as Customer,
    confirmUrl: 'https://app.example/confirm',
    cancelUrl: 'https://app.example/cancel',
  };

  const kinds: NotificationJobKind[] = [
    'CREATED',
    'CONFIRMED',
    'CANCELLED',
    'REMINDER_24H',
    'REMINDER_1H',
  ];

  it.each(kinds)('renders %s with links and escaped html', (kind) => {
    const rendered = renderTemplate(kind, ctxBase);
    expect(rendered.subject.length).toBeGreaterThan(0);
    expect(rendered.text).toContain(ctxBase.service.name);
    if (kind === 'CREATED' || kind === 'CONFIRMED' || kind === 'CANCELLED') {
      expect(rendered.text).toContain(ctxBase.customer.name);
    }
    expect(rendered.text).toContain('Confirmar presença:');
    expect(rendered.text).toContain('Cancelar:');
    expect(rendered.html).toContain('Confirmar presença');
    expect(rendered.html).toContain('Cancelar');
    expect(rendered.html).toContain('&amp;');
    expect(rendered.html).toContain('&lt;Premium&gt;');
  });

  it('omits action links when urls are missing', () => {
    const rendered = renderTemplate('CREATED', {
      ...ctxBase,
      confirmUrl: null,
      cancelUrl: undefined,
    });
    expect(rendered.text).not.toContain('Confirmar presença:');
    expect(rendered.text).not.toContain('Cancelar:');
    expect(rendered.html).not.toContain('Confirmar presença</a>');
    expect(rendered.html).not.toContain('Cancelar</a>');
    expect(rendered.text).toContain('Atenciosamente');
  });

  it('uses distinct subjects per kind', () => {
    const subjects = kinds.map((kind) => renderTemplate(kind, ctxBase).subject);
    expect(new Set(subjects).size).toBe(kinds.length);
  });
});
