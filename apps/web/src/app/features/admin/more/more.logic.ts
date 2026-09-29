/** Rotas do mobile que pertencem à aba Mais. */
export const isMoreSection = (url: string): boolean =>
  /\/(mais|clientes|empresa|excecoes|assinatura)(\/|$|\?)/.test(url);
