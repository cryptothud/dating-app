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

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values)
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop)
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop)
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member)
  }

  async zrevrangebyscore(
    key: string,
    max: string | number,
    min: string | number,
    limit?: number,
  ): Promise<string[]> {
    if (limit !== undefined) {
      return this.client.zrevrangebyscore(key, max, min, 'LIMIT', 0, limit)
    }
    return this.client.zrevrangebyscore(key, max, min)
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    return this.client.zremrangebyrank(key, start, stop)
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    return this.client.zremrangebyscore(key, min, max)
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key)
  }

  async zrevrangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>> {
    const raw = await this.client.zrevrange(key, start, stop, 'WITHSCORES')
    const result: Array<{ member: string; score: number }> = []
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ member: raw[i]!, score: parseFloat(raw[i + 1]!) })
    }
    return result
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern)
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds)
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return
    await this.client.del(keys)
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members)
  }

  async zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max)
  }
}
