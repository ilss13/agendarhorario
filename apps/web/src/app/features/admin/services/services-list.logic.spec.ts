import { serviceListMeta } from './services-list.logic';

describe('serviceListMeta', () => {
  it('formats duration and a whole price with cents', () => {
    expect(serviceListMeta(30, 50)).toMatch(/^30 min · R\$\s*50,00$/);
  });

  it('formats a fractional price', () => {
    expect(serviceListMeta(45, 39.9)).toMatch(/^45 min · R\$\s*39,90$/);
  });

  it('rejects a non-finite or negative price', () => {
    expect(serviceListMeta(30, Number.NaN)).toBeNull();
    expect(serviceListMeta(30, -1)).toBeNull();
  });

  it('rejects a non-positive duration', () => {
    expect(serviceListMeta(0, 50)).toBeNull();
    expect(serviceListMeta(Number.POSITIVE_INFINITY, 50)).toBeNull();
  });
});
