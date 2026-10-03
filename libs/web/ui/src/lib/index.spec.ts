import { SpinnerComponent } from '../index';

describe('ui barrel', () => {
  it('re-exports shared components', () => {
    expect(SpinnerComponent).toBeDefined();
  });
});
