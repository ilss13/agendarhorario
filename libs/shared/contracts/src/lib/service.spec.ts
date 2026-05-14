import { createServiceRequestSchema } from './service';

describe('service contracts', () => {
  it('accepts a valid service input', () => {
    const result = createServiceRequestSchema.safeParse({
      name: 'Corte feminino',
      durationMinutes: 45,
      bufferMinutes: 0,
      price: 80,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects too-short duration', () => {
    const result = createServiceRequestSchema.safeParse({
      name: 'Rápido',
      durationMinutes: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration over 8h', () => {
    const result = createServiceRequestSchema.safeParse({
      name: 'Longo',
      durationMinutes: 9 * 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = createServiceRequestSchema.safeParse({
      name: 'X',
      durationMinutes: 30,
      price: -10,
    });
    expect(result.success).toBe(false);
  });
});
