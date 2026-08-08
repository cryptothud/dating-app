import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const OVERLAP_RADIUS_METERS = 200
const DETECT_INTERVAL_MS = 5 * 60 * 1000 // run every 5 minutes
const DEDUPE_WINDOW_HOURS = 2 // skip pairs seen < 2h ago

export interface WildSighting {
  id: string
  occurredAt: string
  otherUser: {
    id: string
    displayName: string | null
    photoUrl: string | null // null when not revealed (free tier)
    blurred: boolean
  }
}

@Injectable()
export class SeenInWildService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.detectOverlaps()
    }, DETECT_INTERVAL_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async getSightings(userId: string, isPremium: boolean): Promise<WildSighting[]> {
    const overlaps = await this.prisma.locationOverlap.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        occurredAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      orderBy: { occurredAt: 'desc' },
      take: 20,
      include: {
        userA: {
          include: { profile: { include: { photos: { where: { isPrimary: true }, take: 1 } } } },
        },
        userB: {
          include: { profile: { include: { photos: { where: { isPrimary: true }, take: 1 } } } },
        },
      },
    })

    return overlaps.map((o) => {
      const other = o.userAId === userId ? o.userB : o.userA
      const photoUrl = other.profile?.photos[0]?.url ?? null
      return {
        id: o.id,
        occurredAt: o.occurredAt.toISOString(),
        otherUser: {
          id: other.id,
          displayName: isPremium ? (other.profile?.displayName ?? null) : null,
          photoUrl: isPremium ? photoUrl : null,
          blurred: !isPremium,
        },
      }
    })
  }

  async markNotified(userId: string, overlapIds: string[]): Promise<void> {
    // Restrict query to overlaps the caller owns — prevents arbitrary ID enumeration
    const overlaps = await this.prisma.locationOverlap.findMany({
      where: {
        id: { in: overlapIds },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true, userAId: true, userBId: true },
    })
    for (const o of overlaps) {
      if (o.userAId === userId) {
        await this.prisma.locationOverlap.update({ where: { id: o.id }, data: { notifiedA: true } })
      } else {
        await this.prisma.locationOverlap.update({ where: { id: o.id }, data: { notifiedB: true } })
      }
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.locationOverlap.count({
      where: {
        OR: [
          { userAId: userId, notifiedA: false },
          { userBId: userId, notifiedB: false },
        ],
        occurredAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    })
  }

  private async detectOverlaps(): Promise<void> {
    const windowAgo = new Date(Date.now() - 5 * 60 * 1000) // active in last 5 min
    const dedupeAgo = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000)
    const radiusDeg = OVERLAP_RADIUS_METERS / 111320

    // Find all users active in last 5 minutes who have locations
    const active = await this.prisma.userLocation.findMany({
      where: { updatedAt: { gte: windowAgo } },
      select: { userId: true, latitude: true, longitude: true },
    })

    // Simple O(n²) pair check — fine for MVP (< few hundred concurrent users per city)
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]
        const b = active[j]
        if (!a || !b) continue

        const dlat = Math.abs(a.latitude - b.latitude)
        const dlng = Math.abs(a.longitude - b.longitude)
        if (dlat > radiusDeg || dlng > radiusDeg) continue

        // Check dedupe — skip if pair already recorded recently
        const existing = await this.prisma.locationOverlap.findFirst({
          where: {
            OR: [
              { userAId: a.userId, userBId: b.userId },
              { userAId: b.userId, userBId: a.userId },
            ],
            occurredAt: { gte: dedupeAgo },
          },
        })
        if (existing) continue

        await this.prisma.locationOverlap.create({
          data: { userAId: a.userId, userBId: b.userId },
        })
      }
    }
  }
}
