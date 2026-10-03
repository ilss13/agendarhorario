import { availabilityQuerySchema, availabilityResponseSchema } from './availability';

const id = '11111111-1111-4111-8111-111111111111';

describe('availability contracts', () => {
  it('accepts a date range and allows omitting the end date', () => {
    expect(
      availabilityQuerySchema.safeParse({ serviceId: id, from: '2026-10-02', to: '2026-10-09' })
        .success,
    ).toBe(true);
    expect(availabilityQuerySchema.safeParse({ serviceId: id, from: '2026-10-02' }).success).toBe(
      true,
    );
  });

  it('rejects a date that is not AAAA-MM-DD', () => {
    expect(availabilityQuerySchema.safeParse({ serviceId: id, from: '02/10/2026' }).success).toBe(
      false,
    );
  });

  it('accepts days with slots', () => {
    expect(
      availabilityResponseSchema.safeParse({
        serviceId: id,
        days: [{ date: '2026-10-02', slots: [{ start: '13:00', end: '13:30' }] }],
      }).success,
    ).toBe(true);
  });
});
