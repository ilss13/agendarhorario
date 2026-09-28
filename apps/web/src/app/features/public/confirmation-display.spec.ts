import { DateTime } from 'luxon';
import {
  buildAppointmentIcs,
  confirmationDateLabel,
  confirmationIntro,
  confirmationPhase,
  confirmationTimeLabel,
  customerFirstName,
  linkExpiryCopy,
} from './confirmation-display';

describe('confirmation display', () => {
  const now = DateTime.fromISO('2026-09-23T10:00:00.000-03:00', { setZone: true });

  it('formats the greeting, date and time for a valid appointment', () => {
    expect(customerFirstName('Camila Souza')).toBe('Camila');
    expect(confirmationIntro('Camila Souza', 'Estúdio Bella')).toBe(
      'Olá, Camila. A Estúdio Bella está aguardando sua confirmação.',
    );
    expect(confirmationDateLabel('2026-09-23T13:00:00.000Z')).toBe('Qua, 23 de setembro');
    expect(confirmationTimeLabel('2026-09-23T13:00:00.000Z', 45)).toBe('10:00 · 45 min');
    expect(linkExpiryCopy('2026-09-24T10:30:00.000-03:00', now)).toBe(
      'Este link expira em 25 horas.',
    );
    expect(
      confirmationPhase({
        kind: 'CONFIRM',
        alreadyConsumed: false,
        status: 'PENDING',
        resultStatus: null,
      }),
    ).toBe('confirm');
    expect(
      confirmationPhase({
        kind: 'CONFIRM',
        alreadyConsumed: false,
        status: 'PENDING',
        resultStatus: 'CONFIRMED',
      }),
    ).toBe('confirmed');
  });

  it('rejects invalid dates and links that cannot confirm', () => {
    expect(customerFirstName('   ')).toBe('cliente');
    expect(confirmationDateLabel('nao-e-data')).toBe('');
    expect(confirmationTimeLabel('2026-09-23T13:00:00.000Z', -1)).toBe('');
    expect(linkExpiryCopy('nao-e-data', now)).toBe('Este link expira em breve.');
    expect(linkExpiryCopy('2026-09-23T09:00:00.000-03:00', now)).toBe('Este link expirou.');
    expect(linkExpiryCopy('2026-09-23T10:20:00.000-03:00', now)).toBe(
      'Este link expira em 1 hora.',
    );
    expect(
      confirmationPhase({
        kind: 'CONFIRM',
        alreadyConsumed: false,
        status: 'COMPLETED',
        resultStatus: null,
      }),
    ).toBe('used');
    expect(
      confirmationPhase({
        kind: 'CONFIRM',
        alreadyConsumed: false,
        status: 'NO_SHOW',
        resultStatus: null,
      }),
    ).toBe('used');
    expect(confirmationTimeLabel('nao-e-data', 30)).toBe('');
    expect(
      buildAppointmentIcs({
        uid: 'appt-1',
        startsAt: 'nao-e-data',
        endsAt: '2026-09-23T13:45:00.000Z',
        summary: 'Corte',
      }),
    ).toBeNull();
    expect(
      confirmationPhase({
        kind: 'CANCEL',
        alreadyConsumed: false,
        status: 'PENDING',
        resultStatus: null,
      }),
    ).toBe('cancel');
    expect(
      confirmationPhase({
        kind: 'CONFIRM',
        alreadyConsumed: true,
        status: 'PENDING',
        resultStatus: null,
      }),
    ).toBe('used');
    expect(
      confirmationPhase({
        kind: 'CONFIRM',
        alreadyConsumed: false,
        status: 'CANCELLED',
        resultStatus: null,
      }),
    ).toBe('cancelled');
    expect(buildAppointmentIcs({ uid: '', startsAt: 'x', endsAt: 'y', summary: '' })).toBeNull();
  });

  it('builds a calendar file for a confirmed visit', () => {
    const ics = buildAppointmentIcs({
      uid: 'appt-1',
      startsAt: '2026-09-23T13:00:00.000Z',
      endsAt: '2026-09-23T13:45:00.000Z',
      summary: 'Corte, Estúdio',
    });
    expect(ics).toContain('DTSTART:20260923T130000Z');
    expect(ics).toContain('SUMMARY:Corte\\, Estúdio');
  });
});
