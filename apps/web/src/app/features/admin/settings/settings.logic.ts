export const DEFAULT_BRAND_PRIMARY = '#185280';
export const DEFAULT_BRAND_ACCENT = '#0f9e9e';

export const COMPANY_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Noronha',
] as const;

export const timezoneOptions = (current: string): string[] =>
  (COMPANY_TIMEZONES as readonly string[]).includes(current)
    ? [...COMPANY_TIMEZONES]
    : [current, ...COMPANY_TIMEZONES];

export const publicBookingLabel = (slug: string, host: string): string =>
  `${host.replace(/\/$/, '')}/p/${slug}`;

export const publicBookingUrl = (slug: string, origin: string): string =>
  `${origin.replace(/\/$/, '')}/p/${slug}`;

export const companyInitial = (name: string): string => {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toLocaleUpperCase('pt-BR') : '·';
};

export const normalizeHexColor = (value: string): string | null => {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

export const logoFileError = (file: { type: string; name: string }): string | null => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const allowed =
    type === 'image/png' ||
    type === 'image/svg+xml' ||
    name.endsWith('.png') ||
    name.endsWith('.svg');
  return allowed ? null : 'Envie um arquivo PNG ou SVG';
};
