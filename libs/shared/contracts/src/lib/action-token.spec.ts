import { actionPreviewSchema } from './action-token';

const preview = {
  kind: 'CONFIRM' as const,
  alreadyConsumed: false,
  expiresAt: '2026-09-24T13:00:00.000Z',
  appointment: {
    id: '11111111-1111-4111-8111-111111111111',
    serviceName: 'Corte + Barba',
    companyName: 'Estúdio Bella',
    companyPhone: '+5511999999999',
    logoUrl: null,
    customerName: 'Camila Souza',
    durationMinutes: 45,
    price: 80,
    startsAt: '2026-09-23T13:00:00.000Z',
    endsAt: '2026-09-23T13:45:00.000Z',
    status: 'PENDING' as const,
  },
};

describe('actionPreviewSchema', () => {
  it('accepts a confirmation preview', () => {
    expect(actionPreviewSchema.safeParse(preview).success).toBe(true);
  });

  it('rejects a preview without price and expiry', () => {
    const { price: _price, ...appointment } = preview.appointment;
    const result = actionPreviewSchema.safeParse({
      kind: preview.kind,
      alreadyConsumed: preview.alreadyConsumed,
      appointment,
    });
    expect(result.success).toBe(false);
  });
});
