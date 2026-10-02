export interface PlatformEmail {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]!,
  );

const layout = (bodyHtml: string): string =>
  `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:16px;">
      ${bodyHtml}
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#6b7280;font-size:0.9rem;">Agendar Horário</p>
    </div>
  `.trim();

const formatBrl = (priceBrl: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceBrl);

export const renderCompanyWelcome = (input: {
  ownerName: string;
  companyName: string;
  plansUrl: string;
}): PlatformEmail => {
  const text = [
    `Olá ${input.ownerName},`,
    '',
    `A empresa ${input.companyName} foi criada no Agendar Horário.`,
    'O próximo passo é escolher um plano para publicar a página de agendamento e receber avisos dos clientes.',
    '',
    `Escolher plano: ${input.plansUrl}`,
  ].join('\n');
  const html = layout(`
    <p>Olá ${escapeHtml(input.ownerName)},</p>
    <p>A empresa <strong>${escapeHtml(input.companyName)}</strong> foi criada no Agendar Horário.</p>
    <p>O próximo passo é escolher um plano para publicar a página de agendamento e receber avisos dos clientes.</p>
    <p><a href="${escapeHtml(input.plansUrl)}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Escolher plano</a></p>
  `);
  return { subject: 'Bem-vindo ao Agendar Horário', text, html };
};

export const renderCustomerWelcome = (input: {
  name: string;
  appointmentsUrl: string;
}): PlatformEmail => {
  const text = [
    `Olá ${input.name},`,
    '',
    'Sua conta no Agendar Horário foi criada.',
    'Por ela você acompanha confirmações e avisos dos seus agendamentos.',
    '',
    `Meus agendamentos: ${input.appointmentsUrl}`,
  ].join('\n');
  const html = layout(`
    <p>Olá ${escapeHtml(input.name)},</p>
    <p>Sua conta no Agendar Horário foi criada.</p>
    <p>Por ela você acompanha confirmações e avisos dos seus agendamentos.</p>
    <p><a href="${escapeHtml(input.appointmentsUrl)}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Ver agendamentos</a></p>
  `);
  return { subject: 'Bem-vindo ao Agendar Horário', text, html };
};

export const renderPlanSelected = (input: {
  ownerName: string;
  companyName: string;
  planName: string;
  priceBrl: number;
  monthlyAppointmentLimit: number;
  subscriptionUrl: string;
}): PlatformEmail => {
  const price = formatBrl(input.priceBrl);
  const text = [
    `Olá ${input.ownerName},`,
    '',
    `A empresa ${input.companyName} está no plano ${input.planName} (${price}/mês, até ${input.monthlyAppointmentLimit} agendamentos).`,
    'Confirmações e lembretes dos horários passam a ser enviados conforme as preferências da empresa.',
    '',
    `Ver assinatura: ${input.subscriptionUrl}`,
  ].join('\n');
  const html = layout(`
    <p>Olá ${escapeHtml(input.ownerName)},</p>
    <p>A empresa <strong>${escapeHtml(input.companyName)}</strong> está no plano <strong>${escapeHtml(input.planName)}</strong> (${escapeHtml(price)}/mês, até ${input.monthlyAppointmentLimit} agendamentos).</p>
    <p>Confirmações e lembretes dos horários passam a ser enviados conforme as preferências da empresa.</p>
    <p><a href="${escapeHtml(input.subscriptionUrl)}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;">Ver assinatura</a></p>
  `);
  return {
    subject: `Plano ${input.planName} ativo — Agendar Horário`,
    text,
    html,
  };
};
