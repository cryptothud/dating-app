import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

export interface PremiumStatus {
  isPremium: boolean
  isPremiumPlus: boolean
  tier: string | null
}

const CACHE_TTL = 60 // 1-minute cache — subscription changes are not time-critical

@Injectable()
export class PremiumService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getStatus(userId: string): Promise<PremiumStatus> {
    const cacheKey = `premium:${userId}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as PremiumStatus

    const sub = await this.prisma.subscription.findUnique({ where: { userId } })
    const isPremium = !!sub && sub.expiresAt > new Date()
    const isPremiumPlus = isPremium && sub.tier === 'premium_plus'
    const status: PremiumStatus = { isPremium, isPremiumPlus, tier: isPremium ? sub!.tier : null }

    await this.redis.set(cacheKey, JSON.stringify(status), CACHE_TTL)
    return status
  }

  async requirePremium(userId: string): Promise<void> {
    const { isPremium } = await this.getStatus(userId)
    if (!isPremium) throw new ForbiddenException('Premium subscription required')
  }

  async requirePremiumPlus(userId: string): Promise<void> {
    const { isPremiumPlus } = await this.getStatus(userId)
    if (!isPremiumPlus) throw new ForbiddenException('Premium+ subscription required')
  }

  invalidateCache(userId: string): void {
    void this.redis.del(`premium:${userId}`)
  }
}
