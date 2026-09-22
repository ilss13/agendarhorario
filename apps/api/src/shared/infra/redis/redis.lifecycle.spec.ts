import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisLifecycleService, redisClientFactory } from './redis.lifecycle';

jest.mock('ioredis');

describe('RedisLifecycleService', () => {
  it('disconnects redis on module destroy', async () => {
    const disconnect = jest.fn();
    const redis = { disconnect } as unknown as Redis;
    const service = new RedisLifecycleService(redis);

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalled();
  });
});

describe('redisClientFactory', () => {
  beforeEach(() => {
    jest.mocked(Redis).mockClear();
  });

  it('creates redis client with config host and port', () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_HOST') return 'redis.internal';
        if (key === 'REDIS_PORT') return 6380;
        return undefined;
      }),
    } as unknown as ConfigService;

    redisClientFactory(config);

    expect(Redis).toHaveBeenCalledWith({
      host: 'redis.internal',
      port: 6380,
      maxRetriesPerRequest: 1,
    });
  });

  it('falls back to localhost:6379 when redis env is absent', () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    redisClientFactory(config);

    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 1,
    });
  });
});
