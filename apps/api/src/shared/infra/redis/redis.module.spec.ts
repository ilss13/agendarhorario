import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { REDIS_CLIENT } from './redis.constants';
import { RedisLifecycleService } from './redis.lifecycle';
import { RedisModule } from './redis.module';

describe('RedisModule', () => {
  it('is marked as a global module', () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, RedisModule)).toBe(true);
  });

  it('registers redis client factory and lifecycle service', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, RedisModule) as Array<
      typeof RedisLifecycleService | { provide: string }
    >;
    expect(providers).toEqual(
      expect.arrayContaining([
        RedisLifecycleService,
        expect.objectContaining({ provide: REDIS_CLIENT }),
      ]),
    );
  });

  it('exports REDIS_CLIENT token', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, RedisModule)).toEqual([REDIS_CLIENT]);
  });
});
