import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  const service = new TenantContextService();

  it('returns undefined outside of a run context', () => {
    expect(service.get()).toBeUndefined();
  });

  it('exposes context inside run', () => {
    const ctx = { userId: 'u1', companyId: 'c1', role: 'OWNER' as const };
    const seen = service.run(ctx, () => service.get());
    expect(seen).toEqual(ctx);
  });

  it('getOrThrow returns context when present', () => {
    const ctx = { userId: 'u1', companyId: 'c1', role: 'STAFF' as const };
    expect(service.run(ctx, () => service.getOrThrow())).toEqual(ctx);
  });

  it('getOrThrow throws when context is missing', () => {
    expect(() => service.getOrThrow()).toThrow('TenantContext não inicializado');
  });

  it('requireCompanyId returns company id when present', () => {
    const ctx = { userId: 'u1', companyId: 'c1', role: 'OWNER' as const };
    expect(service.run(ctx, () => service.requireCompanyId())).toBe('c1');
  });

  it('requireCompanyId throws when companyId is null', () => {
    const ctx = { userId: 'u1', companyId: null, role: 'CUSTOMER' as const };
    expect(() => service.run(ctx, () => service.requireCompanyId())).toThrow(
      'Usuário não vinculado a uma empresa',
    );
  });
});
