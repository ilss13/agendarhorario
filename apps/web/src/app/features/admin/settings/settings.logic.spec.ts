import {
  companyInitial,
  logoFileError,
  normalizeHexColor,
  publicBookingLabel,
  publicBookingUrl,
  timezoneOptions,
} from './settings.logic';

describe('company settings display', () => {
  it('builds the public booking label and absolute url', () => {
    expect(publicBookingLabel('diva-studio', 'agendarhorario.com')).toBe(
      'agendarhorario.com/p/diva-studio',
    );
    expect(publicBookingUrl('diva-studio', 'https://agendarhorario.com/')).toBe(
      'https://agendarhorario.com/p/diva-studio',
    );
  });

  it('keeps an unknown timezone and lists the Brazilian defaults', () => {
    expect(timezoneOptions('America/Sao_Paulo')).toContain('America/Manaus');
    expect(timezoneOptions('America/Sao_Paulo')).not.toContain('Pacific/Honolulu');
    expect(timezoneOptions('Pacific/Honolulu')[0]).toBe('Pacific/Honolulu');
  });

  it('reads the company initial and falls back when the name is blank', () => {
    expect(companyInitial(' diva studio ')).toBe('D');
    expect(companyInitial('   ')).toBe('·');
  });

  it('accepts a hex color and rejects anything else', () => {
    expect(normalizeHexColor('#185280')).toBe('#185280');
    expect(normalizeHexColor('#AABBCC')).toBe('#aabbcc');
    expect(normalizeHexColor('185280')).toBeNull();
    expect(normalizeHexColor('#fff')).toBeNull();
  });

  it('accepts png and svg logos and rejects other files', () => {
    expect(logoFileError({ type: 'image/png', name: 'logo.png' })).toBeNull();
    expect(logoFileError({ type: '', name: 'marca.SVG' })).toBeNull();
    expect(logoFileError({ type: 'image/jpeg', name: 'foto.jpg' })).toBe(
      'Envie um arquivo PNG ou SVG',
    );
  });
});
