import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisLifecycleService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }
}

export const redisClientFactory = (config: ConfigService): Redis =>
  new Redis({
    host: config.get<string>('REDIS_HOST') ?? 'localhost',
    port: config.get<number>('REDIS_PORT') ?? 6379,
    maxRetriesPerRequest: 1,
  });
