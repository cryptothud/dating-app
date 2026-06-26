import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import type { Env } from '../config/configuration'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis

  constructor(private config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    this.client = new Redis(this.config.get('REDIS_URL'), {
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.client.incr(key)
    if (ttlSeconds && val === 1) {
      await this.client.expire(key, ttlSeconds)
    }
    return val
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }
}
