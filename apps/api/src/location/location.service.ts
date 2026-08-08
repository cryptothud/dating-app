import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import type { MapUser, MapUserStatus } from '@dating-app/types'
import type { MapQueryDto } from './dto/map-query.dto'
import type { UpdateLocationDto } from './dto/update-location.dto'

const BOOST_DURATION_MS = 30 * 60 * 1000 // 30 minutes

interface RawMapRow {
  id: string
  raw_lat: number
  raw_lng: number
  fuzz_radius: number
  display_name: string | null
  age: number | null
  body_type: string | null
  looking_for: string[]
  interests: string[]
  actively_looking: boolean
  is_seeded: boolean
  last_active: Date
  is_verified: boolean
  primary_photo_url: string | null
  boosted_until: Date | null
  profile_highlight: boolean
}

@Injectable()
export class LocationService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<void> {
    await this.enforceRateLimit(`rl:loc:${userId}`, 600, 3600)
    // If travel mode is active, keep the travel coordinates instead of GPS
    const existing = await this.prisma.userLocation.findUnique({ where: { userId } })
    const useTravelCoords =
      existing?.travelMode && existing.travelLat !== null && existing.travelLng !== null
    const lat = useTravelCoords ? existing!.travelLat! : dto.latitude
    const lng = useTravelCoords ? existing!.travelLng! : dto.longitude

    await this.prisma.userLocation.upsert({
      where: { userId },
      create: { userId, latitude: lat, longitude: lng },
      update: { latitude: lat, longitude: lng },
    })
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() },
    })
  }

  async heartbeat(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastActive: new Date() } })
  }

  async getMapUsers(userId: string | null, query: MapQueryDto, ip?: string): Promise<MapUser[]> {
    if (userId) {
      await this.enforceRateLimit(`rl:map:${userId}`, 120, 60)
    } else if (ip) {
      await this.enforceRateLimit(`rl:map:anon:${ip}`, 60, 60)
    }

    // Skip cache when filters are active (filter combos are too numerous to cache individually)
    const hasFilters =
      query.ageMin !== undefined ||
      query.ageMax !== undefined ||
      (query.lookingFor && query.lookingFor.length > 0) ||
      query.activelyOnly ||
      query.bodyType ||
      (query.interests && query.interests.length > 0)

    if (!hasFilters) {
      const cacheKey = userId
        ? `map:${userId}:${this.viewportKey(query)}`
        : `map:anon:${this.viewportKey(query)}`
      const cachedRaw = await this.redis.get(cacheKey)
      if (cachedRaw) return JSON.parse(cachedRaw) as MapUser[]
      const rows = await this.queryMapUsers(userId, query)
      const result = this.transformRows(rows)
      await this.redis.set(cacheKey, JSON.stringify(result), 15)
      return result
    }

    const rows = await this.queryMapUsers(userId, query)
    return this.transformRows(rows)
  }

  private zoomLimit(zoom: number | undefined): number {
    if (!zoom || zoom >= 14) return 200
    if (zoom >= 12) return 400
    if (zoom >= 10) return 800
    return 1500
  }

  private async queryMapUsers(userId: string | null, query: MapQueryDto): Promise<RawMapRow[]> {
    const {
      swLat,
      swLng,
      neLat,
      neLng,
      ageMin,
      ageMax,
      lookingFor,
      activelyOnly,
      bodyType,
      interests,
    } = query
    const limit = this.zoomLimit(query.zoom)

    const ageFilter =
      ageMin !== undefined && ageMax !== undefined
        ? Prisma.sql`AND p.age BETWEEN ${ageMin} AND ${ageMax}`
        : ageMin !== undefined
          ? Prisma.sql`AND p.age >= ${ageMin}`
          : ageMax !== undefined
            ? Prisma.sql`AND p.age <= ${ageMax}`
            : Prisma.empty

    const activeFilter = activelyOnly
      ? Prisma.sql`AND p.actively_looking = true AND (p.actively_looking_expires_at IS NULL OR p.actively_looking_expires_at > NOW())`
      : Prisma.empty

    const bodyTypeFilter = bodyType ? Prisma.sql`AND p.body_type = ${bodyType}` : Prisma.empty

    // lookingFor: user must have at least one of the requested tags
    const lookingForFilter =
      lookingFor && lookingFor.length > 0
        ? Prisma.sql`AND p.looking_for && ${lookingFor}::text[]`
        : Prisma.empty

    // interests: user must share at least one of the requested interests
    const interestsFilter =
      interests && interests.length > 0
        ? Prisma.sql`AND p.interests && ${interests}::text[]`
        : Prisma.empty

    const SELECT_COLS = Prisma.sql`
      ul.user_id                                                AS id,
      ul.latitude                                               AS raw_lat,
      ul.longitude                                              AS raw_lng,
      ul.fuzz_radius,
      p.display_name,
      p.age,
      p.body_type,
      p.looking_for,
      p.interests,
      (p.actively_looking AND
        (p.actively_looking_expires_at IS NULL
          OR p.actively_looking_expires_at > NOW()))            AS actively_looking,
      u.is_seeded,
      u.last_active,
      (v.status = 'approved')                                   AS is_verified,
      CASE WHEN ph.is_nsfw = true THEN NULL ELSE ph.thumb_url END AS primary_photo_url,
      u.boosted_until,
      u.profile_highlight
    `

    const BASE_JOINS = Prisma.sql`
      FROM user_locations ul
      JOIN users u    ON ul.user_id = u.id
      JOIN profiles p ON u.id = p.user_id
      LEFT JOIN photos ph ON ph.profile_id = p.id AND ph.is_primary = true
      LEFT JOIN verifications v ON v.user_id = u.id
    `

    if (userId) {
      return this.prisma.$queryRaw<RawMapRow[]>(Prisma.sql`
        SELECT ${SELECT_COLS}
        ${BASE_JOINS}
        WHERE
          ul.latitude  BETWEEN ${swLat}::float8 AND ${neLat}::float8
          AND ul.longitude BETWEEN ${swLng}::float8 AND ${neLng}::float8
          AND ul.updated_at > NOW() - INTERVAL '3 days'
          AND u.verified = true
          AND u.incognito = false
          AND p.visibility != 'private'
          AND NOT EXISTS (
            SELECT 1 FROM blocks b
            WHERE (b.blocker_id = ${userId} AND b.blocked_id = u.id)
               OR (b.blocker_id = u.id  AND b.blocked_id = ${userId})
          )
          ${ageFilter}
          ${activeFilter}
          ${bodyTypeFilter}
          ${lookingForFilter}
          ${interestsFilter}
        ORDER BY
          CASE WHEN u.boosted_until > NOW() THEN 0 ELSE 1 END,
          ul.updated_at DESC
        LIMIT ${limit}
      `)
    }

    return this.prisma.$queryRaw<RawMapRow[]>(Prisma.sql`
      SELECT ${SELECT_COLS}
      ${BASE_JOINS}
      WHERE
        ul.latitude  BETWEEN ${swLat}::float8 AND ${neLat}::float8
        AND ul.longitude BETWEEN ${swLng}::float8 AND ${neLng}::float8
        AND ul.updated_at > NOW() - INTERVAL '3 days'
        AND u.verified = true
        AND u.incognito = false
        AND p.visibility != 'private'
        ${ageFilter}
        ${activeFilter}
        ${bodyTypeFilter}
        ${lookingForFilter}
        ${interestsFilter}
      ORDER BY
        CASE WHEN u.boosted_until > NOW() THEN 0 ELSE 1 END,
        ul.updated_at DESC
      LIMIT ${limit}
    `)
  }

  private transformRows(rows: RawMapRow[]): MapUser[] {
    return rows.map((r) => {
      const { lat, lng } = this.fuzzCoordinates(r.raw_lat, r.raw_lng, r.fuzz_radius, r.id)
      const lastActiveAt = new Date(r.last_active).toISOString()
      const minutesSinceActive = (Date.now() - new Date(r.last_active).getTime()) / 60000
      const status: MapUserStatus = r.is_seeded
        ? 'seeded'
        : minutesSinceActive < 5
          ? 'online'
          : 'away'
      const isBoosted = !!r.boosted_until && new Date(r.boosted_until) > new Date()
      return {
        id: r.id,
        lat,
        lng,
        status,
        lastActiveAt,
        activelyLooking: r.actively_looking,
        isVerified: r.is_verified,
        isSeeded: r.is_seeded,
        isBoosted,
        profileHighlight: r.profile_highlight,
        displayName: r.display_name ?? undefined,
        age: r.age ?? undefined,
        bodyType: r.body_type ?? undefined,
        interests: r.interests ?? [],
        lookingFor: r.looking_for,
        primaryPhotoUrl: r.primary_photo_url ?? undefined,
      }
    })
  }

  async getClusterData(
    query: MapQueryDto,
    ip?: string,
  ): Promise<Array<{ lat: number; lng: number; count: number }>> {
    if (ip) await this.enforceRateLimit(`rl:map:anon:${ip}`, 60, 60)
    const { swLat, swLng, neLat, neLng } = query
    const zoom = query.zoom ?? 0
    const cellSize = zoom >= 10 ? 0.05 : zoom >= 8 ? 0.2 : 0.5

    const rows = await this.prisma.$queryRaw<Array<{ lat: number; lng: number; count: bigint }>>`
      SELECT
        AVG(ul.latitude)::float8 AS lat,
        AVG(ul.longitude)::float8 AS lng,
        COUNT(*) AS count
      FROM user_locations ul
      JOIN users u    ON u.id  = ul.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE
        ul.latitude  BETWEEN ${swLat}::float8 AND ${neLat}::float8
        AND ul.longitude BETWEEN ${swLng}::float8 AND ${neLng}::float8
        AND ul.updated_at > NOW() - INTERVAL '3 days'
        AND u.verified = true
        AND u.incognito = false
        AND u.banned = false
        AND u.suspended = false
        AND p.visibility != 'private'
      GROUP BY
        ROUND(ul.latitude::numeric  / ${cellSize}::numeric),
        ROUND(ul.longitude::numeric / ${cellSize}::numeric)
      ORDER BY count DESC
    `
    return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lng), count: Number(r.count) }))
  }

  async getMyLocation(
    userId: string,
  ): Promise<{ lat: number; lng: number; fuzzRadius: number } | null> {
    const loc = await this.prisma.userLocation.findUnique({ where: { userId } })
    if (!loc) return null
    const { lat, lng } = this.fuzzCoordinates(loc.latitude, loc.longitude, loc.fuzzRadius)
    return { lat, lng, fuzzRadius: loc.fuzzRadius }
  }

  async setFuzzRadius(userId: string, fuzzRadius: number): Promise<void> {
    await this.prisma.userLocation.upsert({
      where: { userId },
      create: { userId, latitude: 0, longitude: 0, fuzzRadius },
      update: { fuzzRadius },
    })
  }

  async setActivelyLooking(userId: string, enabled: boolean): Promise<void> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } })
    if (!profile) return
    const expiresAt = enabled ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null
    await this.prisma.profile.update({
      where: { userId },
      data: { activelyLooking: enabled, activelyLookingExpiresAt: expiresAt },
    })
  }

  async setTravelMode(userId: string, enabled: boolean, lat?: number, lng?: number): Promise<void> {
    if (enabled && (lat === undefined || lng === undefined)) {
      throw new BadRequestException('lat and lng are required when enabling travel mode')
    }
    await this.prisma.userLocation.upsert({
      where: { userId },
      create: {
        userId,
        latitude: lat ?? 0,
        longitude: lng ?? 0,
        travelMode: enabled,
        travelLat: lat,
        travelLng: lng,
      },
      update: {
        travelMode: enabled,
        travelLat: enabled ? lat : null,
        travelLng: enabled ? lng : null,
      },
    })
  }

  async activateBoost(userId: string, weeklyLimit: number): Promise<{ boostedUntil: string }> {
    const weekKey = `boost:week:${userId}:${this.currentWeekKey()}`
    const used = await this.redis.incr(weekKey, 7 * 24 * 3600)
    if (used > weeklyLimit) {
      throw new BadRequestException(`Boost limit reached (${weeklyLimit}/week)`)
    }
    const boostedUntil = new Date(Date.now() + BOOST_DURATION_MS)
    await this.prisma.user.update({ where: { id: userId }, data: { boostedUntil } })
    return { boostedUntil: boostedUntil.toISOString() }
  }

  async getActivelyLookingStatus(
    userId: string,
  ): Promise<{ enabled: boolean; expiresAt: Date | null }> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { activelyLooking: true, activelyLookingExpiresAt: true },
    })
    if (!profile) return { enabled: false, expiresAt: null }
    const isExpired =
      profile.activelyLookingExpiresAt && profile.activelyLookingExpiresAt < new Date()
    const enabled = profile.activelyLooking && !isExpired
    return { enabled, expiresAt: enabled ? profile.activelyLookingExpiresAt : null }
  }

  // Deterministic fuzz per userId so dots don't jump on repeated map loads
  private stableFuzz(userId: string): { angle: number; ratio: number } {
    let h = 5381
    for (let i = 0; i < userId.length; i++) {
      h = (Math.imul(h, 33) + userId.charCodeAt(i)) >>> 0
    }
    const angle = (h % 628319) / 100000 // 0..2π
    const h2 = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const ratio = Math.sqrt((h2 % 10000) / 10000)
    return { angle, ratio }
  }

  private fuzzCoordinates(
    lat: number,
    lng: number,
    radiusMeters: number,
    userId?: string,
  ): { lat: number; lng: number } {
    const radiusDeg = radiusMeters / 111320
    const { angle, ratio } = userId
      ? this.stableFuzz(userId)
      : { angle: Math.random() * 2 * Math.PI, ratio: Math.sqrt(Math.random()) }
    return {
      lat: lat + ratio * radiusDeg * Math.cos(angle),
      lng: lng + ratio * radiusDeg * Math.sin(angle),
    }
  }

  private viewportKey(q: MapQueryDto): string {
    const zoom = q.zoom ?? 14
    return (
      [q.swLat, q.swLng, q.neLat, q.neLng].map((n) => Math.round(n * 100)).join(':') + `:z${zoom}`
    )
  }

  private currentWeekKey(): string {
    const now = new Date()
    const year = now.getUTCFullYear()
    const weekNum = Math.floor(
      (now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 3600 * 1000),
    )
    return `${year}w${weekNum}`
  }

  private async enforceRateLimit(key: string, limit: number, windowSec: number): Promise<void> {
    const count = await this.redis.incr(key, windowSec)
    if (count > limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS)
    }
  }
}
