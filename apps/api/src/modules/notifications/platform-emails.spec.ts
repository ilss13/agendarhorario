import { renderCompanyWelcome, renderCustomerWelcome, renderPlanSelected } from './platform-emails';

describe('platform emails', () => {
  it('renders the company welcome with the plans link', () => {
    const rendered = renderCompanyWelcome({
      ownerName: 'Ana',
      companyName: 'Salão',
      plansUrl: 'http://localhost:4200/dashboard/assinatura',
    });

    expect(rendered.subject).toBe('Bem-vindo ao Agendar Horário');
    expect(rendered.text).toContain('Salão');
    expect(rendered.text).toContain('http://localhost:4200/dashboard/assinatura');
    expect(rendered.html).toContain('Escolher plano');
  });

  it('escapes html in the company welcome', () => {
    const rendered = renderCompanyWelcome({
      ownerName: 'Ana <script>',
      companyName: 'Salão & Co',
      plansUrl: 'http://localhost:4200/dashboard/assinatura?x=1&y=2',
    });

    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('Ana &lt;script&gt;');
    expect(rendered.html).toContain('Salão &amp; Co');
    expect(rendered.text).toContain('Ana <script>');
  });

  it('renders the customer welcome with the appointments link', () => {
    const rendered = renderCustomerWelcome({
      name: 'Bruno',
      appointmentsUrl: 'http://localhost:4200/me/agendamentos',
    });

    expect(rendered.subject).toBe('Bem-vindo ao Agendar Horário');
    expect(rendered.text).toContain('Bruno');
    expect(rendered.html).toContain('http://localhost:4200/me/agendamentos');
  });

  it('renders the selected plan with price and limit', () => {
    const rendered = renderPlanSelected({
      ownerName: 'Ana',
      companyName: 'Salão',
      planName: 'Básico',
      priceBrl: 39.9,
      monthlyAppointmentLimit: 25,
      subscriptionUrl: 'http://localhost:4200/dashboard/assinatura',
    });

    expect(rendered.subject).toContain('Básico');
    expect(rendered.text).toContain('R$');
    expect(rendered.text).toContain('39,90');
    expect(rendered.text).toContain('25');
    expect(rendered.html).toContain('Ver assinatura');
  });

  it('escapes the plan name in html', () => {
    const rendered = renderPlanSelected({
      ownerName: 'Ana',
      companyName: 'Salão',
      planName: 'Plano <Pro>',
      priceBrl: 10,
      monthlyAppointmentLimit: 1,
      subscriptionUrl: 'http://localhost:4200/dashboard/assinatura',
    });

    expect(rendered.html).toContain('Plano &lt;Pro&gt;');
    expect(rendered.html).not.toContain('Plano <Pro>');
  });
});
