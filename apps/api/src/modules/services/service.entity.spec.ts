import { Service } from './service.entity';

describe('Service', () => {
  it('holds service fields when constructed', () => {
    const entity = new Service();
    entity.id = 'svc-1';
    entity.companyId = 'company-1';
    entity.name = 'Corte';
    entity.description = 'Corte masculino';
    entity.durationMinutes = 30;
    entity.bufferMinutes = 15;
    entity.price = 50;
    entity.active = true;

    expect(entity.name).toBe('Corte');
    expect(entity.durationMinutes).toBe(30);
    expect(entity.bufferMinutes).toBe(15);
    expect(entity.price).toBe(50);
    expect(entity.active).toBe(true);
  });

  it('allows inactive service with null description', () => {
    const entity = new Service();
    entity.active = false;
    entity.description = null;
    entity.bufferMinutes = 0;
    entity.price = 0;

    expect(entity.active).toBe(false);
    expect(entity.description).toBeNull();
    expect(entity.bufferMinutes).toBe(0);
  });
});
