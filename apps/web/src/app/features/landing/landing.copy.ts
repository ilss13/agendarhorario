import { SUBSCRIPTION_TRIAL_DAYS } from '@agendarhorario/contracts';

export type LandingIconName =
  | 'check'
  | 'link'
  | 'bell'
  | 'calendar'
  | 'phone'
  | 'mail'
  | 'chat'
  | 'chart'
  | 'shield';

export interface PlanCopy {
  /** Identificador legível para o destaque visual; deve casar com PlanCode do backend. */
  code: 'basico' | 'medio' | 'grande' | 'super';
  tagline: string;
  highlight?: boolean;
  features: string[];
}

export const LANDING_COPY = {
  brand: 'Agendar Horário',
  nav: [
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Recursos', href: '#recursos' },
    { label: 'Planos', href: '#planos' },
    { label: 'Dúvidas', href: '#duvidas' },
  ],
  hero: {
    chip: `${SUBSCRIPTION_TRIAL_DAYS} dias grátis · conta sem cartão`,
    headline: 'Seu cliente escolhe o horário. Você só confere a agenda do dia.',
    subheadline:
      'Um link de agendamento que funciona 24h, lembretes automáticos por e-mail, SMS ou WhatsApp e a agenda do dia inteira num olhar. Tudo pronto em 5 minutos.',
    emailLabel: 'Seu e-mail',
    emailPlaceholder: 'Seu melhor e-mail',
    primaryCta: 'Criar minha agenda grátis',
    checks: ['Sem fidelidade', 'Cancele quando quiser', 'Pronto em 5 minutos'],
    emailError: 'Informe um e-mail válido.',
  },
  audiences: {
    headline: 'Feito para quem vive de hora marcada:',
    items: [
      'Barbearias',
      'Salões de beleza',
      'Estética',
      'Clínicas',
      'Psicólogos',
      'Personal trainers',
      'Autônomos',
    ],
  },
  problems: {
    eyebrow: 'Por que trocar',
    headline: 'Pare de perder tempo — e clientes — com a agenda no WhatsApp.',
    items: [
      {
        icon: 'link' as const,
        title: 'Agenda aberta 24h',
        description:
          'Um link na bio e no WhatsApp. O cliente vê só os horários livres e marca em 30 segundos, sem você responder mensagem.',
        punchline: 'Chega de "tem horário amanhã?"',
      },
      {
        icon: 'bell' as const,
        title: 'Menos faltas',
        description:
          'Lembretes automáticos 24h e 1h antes. O cliente confirma ou cancela com um clique e o horário volta a ficar livre.',
        punchline: 'Cadeira vazia custa caro.',
      },
      {
        icon: 'calendar' as const,
        title: 'O dia num olhar',
        description:
          'Linha do tempo do dia, próximos dias numa tira e encaixe manual quando o cliente liga ou aparece na porta.',
        punchline: 'Abra o celular e saiba como é seu dia.',
      },
    ],
  },
  howItWorks: {
    eyebrow: 'Como funciona',
    headline: 'Sua agenda no ar em 5 minutos.',
    cta: 'Começar agora',
    steps: [
      {
        n: 1,
        title: 'Crie a conta',
        description: 'Nome da empresa, e-mail e senha. Sem cartão.',
      },
      {
        n: 2,
        title: 'Cadastre serviços e horários',
        description: 'Duração, preço, dias de atendimento, folgas e feriados.',
      },
      {
        n: 3,
        title: 'Compartilhe seu link',
        description: 'agendarhorario.com/p/sua-empresa — pronto para o Instagram e o WhatsApp.',
      },
    ],
  },
  features: {
    eyebrow: 'Recursos',
    headline: 'Tudo o que você precisa para profissionalizar a agenda.',
    items: [
      {
        icon: 'phone' as const,
        title: 'Página pública no celular',
        description: 'Carrega rápido e mostra seus horários sempre atualizados.',
      },
      {
        icon: 'mail' as const,
        title: 'Agendamento sem login',
        description: 'O cliente só valida e-mail ou SMS. Nada de cadastro chato.',
      },
      {
        icon: 'chat' as const,
        title: 'E-mail, SMS ou WhatsApp',
        description: 'E-mail incluso em todos os planos; SMS ou WhatsApp à sua escolha.',
      },
      {
        icon: 'check' as const,
        title: 'Confirmação por link',
        description: 'Em cada lembrete o cliente confirma ou cancela com um clique.',
      },
      {
        icon: 'chart' as const,
        title: 'Painel de hoje, semana e mês',
        description: 'Saiba quem chega hoje e quanto falta para fechar a semana.',
      },
      {
        icon: 'shield' as const,
        title: 'Dados protegidos (LGPD)',
        description: 'Dados criptografados e exportação a qualquer momento.',
      },
    ],
  },
  pricing: {
    eyebrow: 'Planos',
    headline: 'Planos simples, por volume de agendamentos.',
    sub: `${SUBSCRIPTION_TRIAL_DAYS} dias grátis em todos os planos. Cancele antes do fim do teste e não cobramos nada.`,
    cta: `Testar ${SUBSCRIPTION_TRIAL_DAYS} dias grátis`,
    badge: 'Mais escolhido',
    footnote:
      'Pagamento por PIX, boleto ou cartão · Sem fidelidade · Troque de plano quando quiser',
    plans: [
      {
        code: 'basico' as const,
        tagline: 'Para quem atende sozinho',
        features: ['Lembretes por e-mail', 'Página pública e link'],
      },
      {
        code: 'medio' as const,
        tagline: 'Para agenda cheia todo dia',
        highlight: true,
        features: ['Lembretes por e-mail + SMS ou WhatsApp', 'Painel de hoje, semana e mês'],
      },
      {
        code: 'grande' as const,
        tagline: 'Para salões e clínicas',
        features: ['Todos os canais de lembrete', 'Múltiplos serviços'],
      },
      {
        code: 'super' as const,
        tagline: 'Para quem precisa de mais volume',
        features: ['Faturas e relatórios', 'Suporte prioritário'],
      },
    ] satisfies PlanCopy[],
  },
  faq: {
    eyebrow: 'Dúvidas',
    headline: 'Perguntas frequentes',
    supportLead: 'Não achou sua resposta?',
    supportLabel: 'Fale com a gente',
    supportHref: 'mailto:suporte@agendarhorario.com',
    items: [
      {
        q: 'Vocês oferecem teste grátis?',
        a: `Sim. Ao escolher um plano você ganha ${SUBSCRIPTION_TRIAL_DAYS} dias grátis. A conta é criada sem cartão; na ativação do plano pedimos o cartão, e a cobrança só começa depois do teste se você não cancelar.`,
      },
      {
        q: 'Posso cancelar quando quiser?',
        a: 'Sim, sem multa. O acesso continua até o fim do ciclo já pago.',
      },
      {
        q: 'Meu cliente precisa criar conta?',
        a: 'Não. O cliente só valida e-mail ou SMS para confirmar o horário.',
      },
      {
        q: 'Como troco de plano?',
        a: 'Direto no painel. Upgrade vale na hora; downgrade no próximo ciclo.',
      },
      {
        q: 'E se eu estourar o limite de agendamentos?',
        a: 'A página pública mostra indisponível até a renovação ou o seu upgrade.',
      },
      {
        q: 'Aceitam PIX ou boleto?',
        a: 'Sim, via Stripe — cartão, PIX e boleto.',
      },
      {
        q: 'Meus dados estão seguros?',
        a: 'Seguimos a LGPD, com criptografia em trânsito e em repouso, e exportação a qualquer momento.',
      },
    ],
  },
  ctaFinal: {
    headline: 'Comece hoje. Sua agenda no ar em 5 minutos.',
    sub: `Crie a conta sem cartão. Você só paga se decidir continuar depois dos ${SUBSCRIPTION_TRIAL_DAYS} dias.`,
    emailLabel: 'Seu e-mail',
    emailPlaceholder: 'voce@seunegocio.com.br',
    primaryCta: 'Criar minha agenda grátis',
  },
  sticky: {
    title: `${SUBSCRIPTION_TRIAL_DAYS} dias grátis`,
    sub: 'Sem fidelidade · cancele quando quiser',
    cta: 'Começar grátis',
  },
  footer: {
    blurb:
      'Agenda online com link de agendamento e lembretes automáticos para quem vive de hora marcada.',
    legal: '© 2026 Agendar Horário',
    columns: [
      {
        title: 'Produto',
        links: [
          { label: 'Recursos', href: '#recursos' },
          { label: 'Planos', href: '#planos' },
          { label: 'Dúvidas', href: '#duvidas' },
        ],
      },
      {
        title: 'Para',
        links: [
          { label: 'Barbearias', href: '#para' },
          { label: 'Salões', href: '#para' },
          { label: 'Clínicas e terapeutas', href: '#para' },
        ],
      },
      {
        title: 'Empresa',
        links: [
          { label: 'Contato', href: 'mailto:suporte@agendarhorario.com' },
          { label: 'Termos de uso', href: '/termos' },
          { label: 'Privacidade', href: '/privacidade' },
        ],
      },
    ],
  },
};
