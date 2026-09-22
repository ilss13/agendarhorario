import { AppController } from './app.controller';

describe('AppController', () => {
  const controller = new AppController();

  it('returns ok health with an ISO timestamp', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
    expect(() => new Date(result.ts).toISOString()).not.toThrow();
    expect(result.ts).toBe(new Date(result.ts).toISOString());
  });

  it('throws a deliberate Error for Sentry debug', () => {
    expect(() => controller.getError()).toThrow(Error);
    expect(() => controller.getError()).toThrow('My first Sentry error!');
  });
});
