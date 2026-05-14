import { DateTime } from 'luxon';
import type { Appointment } from '../appointments/appointment.entity';
import type { Company } from '../companies/company.entity';
import type { Customer } from '../customers/customer.entity';
import type { Service } from '../services/service.entity';
import type { NotificationJobKind } from './notifications.constants';

export interface RenderContext {
  appointment: Appointment;
  company: Company;
  service: Service;
  customer: Customer;
  confirmUrl?: string | null;
  cancelUrl?: string | null;
}

export interface RenderedMessage {
  subject: string;
  text: string;
  html: string;
}

const formatStart = (date: Date, timezone: string): string =>
  DateTime.fromJSDate(date).setZone(timezone).setLocale('pt-BR').toFormat("dd/MM/yyyy 'às' HH:mm");

const baseFooter = (company: Company, ctx: RenderContext): string => {
  const lines: string[] = [];
  if (ctx.confirmUrl) lines.push(`Confirmar presença: ${ctx.confirmUrl}`);
  if (ctx.cancelUrl) lines.push(`Cancelar: ${ctx.cancelUrl}`);
  lines.push(`Atenciosamente,\n${company.name}`);
  return lines.join('\n');
};

const intro = (kind: NotificationJobKind, ctx: RenderContext, when: string): string => {
  switch (kind) {
    case 'CREATED':
      return `Olá ${ctx.customer.name}, seu agendamento para ${ctx.service.name} foi recebido para ${when}. Em breve enviaremos a confirmação.`;
    case 'CONFIRMED':
      return `Olá ${ctx.customer.name}, seu agendamento para ${ctx.service.name} em ${when} foi CONFIRMADO.`;
    case 'CANCELLED':
      return `Olá ${ctx.customer.name}, seu agendamento para ${ctx.service.name} em ${when} foi CANCELADO.`;
    case 'REMINDER_24H':
      return `Lembrete: seu agendamento para ${ctx.service.name} é amanhã, ${when}.`;
    case 'REMINDER_1H':
      return `Lembrete: seu agendamento para ${ctx.service.name} é em 1 hora (${when}).`;
  }
};

export const renderTemplate = (kind: NotificationJobKind, ctx: RenderContext): RenderedMessage => {
  const when = formatStart(ctx.appointment.startsAt, ctx.company.timezone);
  const body = intro(kind, ctx, when);
  const footer = baseFooter(ctx.company, ctx);
  const text = `${body}\n\n${footer}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:16px;">
      <p>${escapeHtml(body)}</p>
      ${ctx.confirmUrl ? `<p><a href="${ctx.confirmUrl}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Confirmar presença</a></p>` : ''}
      ${ctx.cancelUrl ? `<p><a href="${ctx.cancelUrl}" style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;">Cancelar</a></p>` : ''}
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#6b7280;font-size:0.9rem;">Atenciosamente,<br/>${escapeHtml(ctx.company.name)}</p>
    </div>
  `.trim();
  const subjectByKind: Record<NotificationJobKind, string> = {
    CREATED: `Agendamento recebido — ${ctx.service.name}`,
    CONFIRMED: `Agendamento confirmado — ${ctx.service.name}`,
    CANCELLED: `Agendamento cancelado — ${ctx.service.name}`,
    REMINDER_24H: `Lembrete: amanhã ${when}`,
    REMINDER_1H: `Lembrete: em 1 hora — ${ctx.service.name}`,
  };
  return { subject: subjectByKind[kind], text, html };
};

const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!,
  );
