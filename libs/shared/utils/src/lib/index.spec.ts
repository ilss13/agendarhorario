import { APP_TIMEZONE } from '../index';

describe('utils barrel', () => {
  it('re-exports the application timezone', () => {
    expect(APP_TIMEZONE).toBe('America/Sao_Paulo');
  });
});
