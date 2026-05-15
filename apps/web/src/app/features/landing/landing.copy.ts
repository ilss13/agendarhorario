export interface PlanCopy {
  /** Identificador legível para o destaque visual; deve casar com PlanCode do backend. */
  code: 'basico' | 'medio' | 'grande' | 'super';
  highlight?: boolean;
  features: string[];
}

export const LANDING_COPY = {
  brand: 'Agendar Horário',
  hero: {
    eyebrow: 'Agenda online sem dor de cabeça',
    headline: 'Sua agenda lotada sem WhatsApp travado.',
    subheadline:
      'Receba agendamentos online com lembretes automáticos por e-mail, SMS ou WhatsApp.',
    primaryCta: 'Começar — R$ 39,90/mês',
    secondaryCta: 'Ver planos',
    trustBadges: ['Sem fidelidade', 'Cancele quando quiser', 'Suporte em português'],
  },
  socialProof: {
    headline: 'Salões, clínicas, estúdios e prestadores autônomos já agendam por aqui.',
  },
  problems: {
    headline: 'Pare de perder tempo (e clientes) com a agenda no WhatsApp.',
    items: [
      {
        title: 'Sem mais "qual horário está livre?"',
        description:
          'O cliente vê só os horários disponíveis e marca em 30 segundos, sem você responder mensagens.',
      },
      {
        title: 'Adeus aos no-shows',
        description:
          'Lembretes automáticos 24h e 1h antes; o cliente pode confirmar ou cancelar com 1 clique.',
      },
      {
        title: 'Visão clara da semana',
        description:
          'Saiba quantos agendamentos faltam para fechar a semana e quem está chegando hoje.',
      },
    ],
  },
  pricing: {
    headline: 'Planos simples por volume de agendamentos.',
    sub: 'Comece pelo básico e troque a qualquer momento — sem multa.',
    plans: [
      {
        code: 'basico' as const,
        features: [
          'Até 25 agendamentos/mês',
          'E-mail + SMS ou WhatsApp',
          'Página pública /p/sua-empresa',
          'Lembretes automáticos',
        ],
      },
      {
        code: 'medio' as const,
        highlight: true,
        features: [
          'Até 50 agendamentos/mês',
          'E-mail + SMS ou WhatsApp',
          'Lembretes 24h e 1h',
          'Confirmação por link',
        ],
      },
      {
        code: 'grande' as const,
        features: [
          'Até 100 agendamentos/mês',
          'E-mail + SMS ou WhatsApp',
          'Múltiplos serviços',
          'Página pública mobile-first',
        ],
      },
      {
        code: 'super' as const,
        features: [
          'Até 250 agendamentos/mês',
          'E-mail + SMS ou WhatsApp',
          'Faturas e relatórios',
          'Suporte prioritário',
        ],
      },
    ] satisfies PlanCopy[],
  },
  howItWorks: {
    headline: 'Em 5 minutos sua agenda está no ar.',
    steps: [
      {
        n: 1,
        title: 'Crie a conta da empresa',
        description: 'Você precisa apenas de nome, slug, e-mail e senha.',
      },
      {
        n: 2,
        title: 'Configure serviços e horários',
        description: 'Defina duração, preço e seus horários de atendimento por dia da semana.',
      },
      {
        n: 3,
        title: 'Compartilhe seu link',
        description: 'agendar.com/p/sua-empresa — pronto pro Instagram e WhatsApp.',
      },
    ],
  },
  features: {
    headline: 'Tudo que você precisa para profissionalizar a agenda.',
    items: [
      {
        title: 'Página pública mobile-first',
        description: 'Carrega rápido no celular, com seus horários sempre atualizados.',
      },
      {
        title: 'Agendamento sem login',
        description: 'Cliente só valida e-mail ou SMS — sem cadastros chatos.',
      },
      {
        title: 'Confirmação por link',
        description: 'Em cada lembrete o cliente pode confirmar ou cancelar com 1 clique.',
      },
      {
        title: 'Dashboards de hoje, semana e mês',
        description: 'Visão clara da agenda em qualquer dispositivo.',
      },
      {
        title: 'Multi-canal',
        description: 'E-mail incluso em todos os planos; SMS ou WhatsApp à sua escolha.',
      },
      {
        title: 'LGPD-compliant',
        description: 'Dados criptografados e exportação a qualquer momento.',
      },
    ],
  },
  faq: {
    headline: 'Dúvidas frequentes',
    items: [
      {
        q: 'Posso cancelar quando quiser?',
        a: 'Sim, sem multa. O acesso continua até o fim do ciclo já pago.',
      },
      {
        q: 'Como troco de plano?',
        a: 'Direto no painel. Upgrade vale na hora; downgrade no próximo ciclo.',
      },
      {
        q: 'E se eu estourar o limite?',
        a: 'A página pública mostra "indisponível" até a renovação ou seu upgrade.',
      },
      {
        q: 'Vocês oferecem teste grátis?',
        a: 'Hoje não, mas garantimos reembolso nos 7 primeiros dias.',
      },
      { q: 'Aceitam PIX/boleto?', a: 'Sim, via Stripe — cartão, PIX e boleto.' },
      {
        q: 'Meus dados estão seguros?',
        a: 'LGPD-compliant, criptografia em trânsito e em repouso, com auditoria.',
      },
    ],
  },
  ctaFinal: {
    headline: 'Comece em 5 minutos.',
    sub: 'Sem cartão para criar conta. Você só paga quando ativar o plano.',
    primaryCta: 'Comece agora',
  },
  footer: {
    legal: '© 2026 Agendar Horário · ',
    links: [
      { label: 'Termos', href: '/termos' },
      { label: 'Privacidade', href: '/privacidade' },
      { label: 'Suporte', href: 'mailto:suporte@agendarhorario.com' },
    ],
  },
};
