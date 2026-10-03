import { publicCompanySchema, publicServiceSchema } from './public-company';

const id = '11111111-1111-4111-8111-111111111111';

describe('public company contracts', () => {
  it('accepts a public service and a bookable company', () => {
    const service = {
      id,
      name: 'Corte',
      description: null,
      durationMinutes: 30,
      bufferMinutes: 0,
      price: 40,
    };
    expect(publicServiceSchema.safeParse(service).success).toBe(true);
    expect(
      publicCompanySchema.safeParse({
        id,
        name: 'Salao',
        slug: 'salao',
        phone: null,
        timezone: 'America/Sao_Paulo',
        logoUrl: null,
        businessHours: [
          {
            id,
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
        services: [service],
        status: 'AVAILABLE',
        statusReason: null,
      }).success,
    ).toBe(true);
  });

  it('rejects a service with zero duration and an unknown status', () => {
    expect(
      publicServiceSchema.safeParse({
        id,
        name: 'Corte',
        description: null,
        durationMinutes: 0,
        bufferMinutes: 0,
        price: 40,
      }).success,
    ).toBe(false);
    expect(
      publicCompanySchema.safeParse({
        id,
        name: 'Salao',
        slug: 'salao',
        phone: null,
        timezone: 'America/Sao_Paulo',
        logoUrl: null,
        businessHours: [],
        services: [],
        status: 'CLOSED',
        statusReason: null,
      }).success,
    ).toBe(false);
  });
});
