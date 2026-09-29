import { isMoreSection } from './more.logic';

describe('isMoreSection', () => {
  it('matches the more tab and its destinations', () => {
    expect(isMoreSection('/dashboard/mais')).toBe(true);
    expect(isMoreSection('/dashboard/clientes')).toBe(true);
    expect(isMoreSection('/dashboard/empresa')).toBe(true);
    expect(isMoreSection('/dashboard/excecoes')).toBe(true);
    expect(isMoreSection('/dashboard/assinatura?status=ok')).toBe(true);
  });

  it('ignores the primary tabs and lookalike paths', () => {
    expect(isMoreSection('/dashboard/agenda')).toBe(false);
    expect(isMoreSection('/dashboard/servicos')).toBe(false);
    expect(isMoreSection('/dashboard/horarios')).toBe(false);
    expect(isMoreSection('/dashboard/empresarial')).toBe(false);
  });
});
