import { BaseEntity } from './base.entity';

class SampleEntity extends BaseEntity {}

describe('BaseEntity', () => {
  it('allows assigning shared audit fields', () => {
    const entity = new SampleEntity();
    const createdAt = new Date('2026-05-01T12:00:00.000Z');
    const updatedAt = new Date('2026-05-02T12:00:00.000Z');

    entity.id = '11111111-1111-1111-1111-111111111111';
    entity.createdAt = createdAt;
    entity.updatedAt = updatedAt;
    entity.deletedAt = null;
    entity.version = 1;

    expect(entity).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      createdAt,
      updatedAt,
      deletedAt: null,
      version: 1,
    });
  });

  it('supports soft-delete timestamp when set', () => {
    const entity = new SampleEntity();
    const deletedAt = new Date('2026-05-03T12:00:00.000Z');
    entity.deletedAt = deletedAt;
    expect(entity.deletedAt).toEqual(deletedAt);
  });
});
