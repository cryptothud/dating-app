import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import type { GlobalMessage, GlobalChatHistory } from '@dating-app/types'

const REDIS_KEY = 'global_chat_v2'
const MAX_STORED = 500
const PAGE_SIZE = 30

@Injectable()
export class GlobalChatService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getHistory(before?: number): Promise<GlobalChatHistory> {
    const max = before !== undefined ? before - 1 : '+inf'
    const raw = await this.redis.zrevrangebyscore(REDIS_KEY, max, '-inf', PAGE_SIZE + 1)
    const hasMore = raw.length > PAGE_SIZE
    const messages = raw
      .slice(0, PAGE_SIZE)
      .map((s) => JSON.parse(s) as GlobalMessage)
      .reverse()
    return { messages, hasMore }
  }

  async addMessage(userId: string, body: string): Promise<GlobalMessage> {
    const [user, location] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: { include: { photos: { orderBy: { isPrimary: 'desc' as const }, take: 1 } } },
        },
      }),
      this.prisma.userLocation.findUnique({ where: { userId } }),
    ])

    let lat: number | undefined
    let lng: number | undefined
    if (location) {
      const fuzzed = this.fuzzCoordinates(location.latitude, location.longitude, location.fuzzRadius)
      lat = fuzzed.lat
      lng = fuzzed.lng
    }

    const msg: GlobalMessage = {
      id: randomUUID(),
      userId,
      displayName: user?.profile?.displayName ?? 'User',
      photoUrl: user?.profile?.photos[0]?.url ?? null,
      body: body.trim(),
      sentAt: new Date().toISOString(),
      lat,
      lng,
    }

    const score = Date.now()
    await this.redis.zadd(REDIS_KEY, score, JSON.stringify(msg))

    const count = await this.redis.zcard(REDIS_KEY)
    if (count > MAX_STORED) {
      await this.redis.zremrangebyrank(REDIS_KEY, 0, count - MAX_STORED - 1)
    }

    return msg
  }

  async pinGlobalMessage(messageId: string, body: string, senderName: string, durationMinutes: number) {
    const pinnedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    const pinned = { messageId, body, senderName, pinnedUntil }
    await this.redis.set('global_chat:pinned', JSON.stringify(pinned), durationMinutes * 60)
    return pinned
  }

  async deleteGlobalMessage(messageId: string): Promise<void> {
    // Scan all members, find the one with matching id, remove it
    const all = await this.redis.zrangebyscore(REDIS_KEY, '-inf', '+inf')
    const member = all.find((s) => {
      try { return (JSON.parse(s) as { id: string }).id === messageId } catch { return false }
    })
    if (member) await this.redis.zrem(REDIS_KEY, member)
  }

  async deleteUserMessages(userId: string): Promise<void> {
    const all = await this.redis.zrangebyscore(REDIS_KEY, '-inf', '+inf')
    const toRemove = all.filter((s) => {
      try { return (JSON.parse(s) as { userId: string }).userId === userId } catch { return false }
    })
    if (toRemove.length) await this.redis.zrem(REDIS_KEY, ...toRemove)
  }

  async unpinGlobalMessage(): Promise<void> {
    await this.redis.del('global_chat:pinned')
  }

  async getPinnedGlobalMessage() {
    const raw = await this.redis.get('global_chat:pinned')
    if (!raw) return null
    const pinned = JSON.parse(raw) as { messageId: string; body: string; senderName: string; pinnedUntil: string }
    if (new Date(pinned.pinnedUntil) <= new Date()) return null
    return pinned
  }

  private fuzzCoordinates(lat: number, lng: number, radiusMeters: number): { lat: number; lng: number } {
    const radiusDeg = radiusMeters / 111320
    const angle = Math.random() * 2 * Math.PI
    const distance = Math.sqrt(Math.random()) * radiusDeg
    return {
      lat: lat + distance * Math.cos(angle),
      lng: lng + distance * Math.sin(angle),
    }
  }
}
