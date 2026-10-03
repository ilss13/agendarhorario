import { WEB_ENV } from '../index';

describe('data-access barrel', () => {
  it('re-exports the web environment token', () => {
    expect(WEB_ENV).toBeDefined();
  });
});
