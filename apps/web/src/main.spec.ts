describe('main', () => {
  const bootstrapApplication = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    bootstrapApplication.mockReset();
    jest.doMock('./sentry', () => ({}));
    jest.doMock('@angular/platform-browser', () => ({
      bootstrapApplication: (...args: unknown[]) => bootstrapApplication(...args),
    }));
  });

  it('bootstraps the root component', async () => {
    bootstrapApplication.mockResolvedValue(undefined);
    await import('./main');
    expect(bootstrapApplication).toHaveBeenCalledTimes(1);
  });

  it('logs a bootstrap failure', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    bootstrapApplication.mockRejectedValue(new Error('boot'));
    await import('./main');
    await Promise.resolve();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
