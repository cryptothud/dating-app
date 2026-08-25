import { describe, it, expect, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { LocationService } from '../location.service'

function makePrisma() {
  return {
    userLocation: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
    profile: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  }
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    incr: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(false),
  }
}

function makeConfig(showSeededAlways = true) {
  return { get: vi.fn().mockReturnValue(showSeededAlways) }
}

function buildService(
  overrides: {
    prisma?: ReturnType<typeof makePrisma>
    redis?: ReturnType<typeof makeRedis>
    config?: ReturnType<typeof makeConfig>
  } = {},
) {
  const prisma = overrides.prisma ?? makePrisma()
  const redis = overrides.redis ?? makeRedis()
  const config = overrides.config ?? makeConfig()
  const service = new LocationService(prisma as never, redis as never, config as never)
  return { service, prisma, redis, config }
}

// ─── fuzzCoordinates ────────────────────────────────────────────────────────

describe('LocationService fuzz coordinates', () => {
  it('keeps fuzzed point within the specified radius', () => {
    const { service } = buildService()
    const lat = 33.4484
    const lng = -112.074
    const radiusMeters = 500

    type Fuzz = (lat: number, lng: number, r: number) => { lat: number; lng: number }
    const fuzz = (service as unknown as { fuzzCoordinates: Fuzz }).fuzzCoordinates.bind(service)

    const outOfBounds = Array.from({ length: 200 }).filter(() => {
      const result = fuzz(lat, lng, radiusMeters)
      const dlat = result.lat - lat
      const dlng = result.lng - lng
      const distMeters = Math.sqrt(
        (dlat * 111320) ** 2 + (dlng * 111320 * Math.cos((lat * Math.PI) / 180)) ** 2,
      )
      return distMeters > radiusMeters * 1.05
    })

    expect(outOfBounds.length).toBe(0)
  })

  it('never returns the exact original coordinates', () => {
    const { service } = buildService()
    const lat = 40.7128
    const lng = -74.006

    type Fuzz = (lat: number, lng: number, r: number) => { lat: number; lng: number }
    const fuzz = (service as unknown as { fuzzCoordinates: Fuzz }).fuzzCoordinates.bind(service)

    const exact = Array.from({ length: 50 }, () => fuzz(lat, lng, 150)).filter(
      (r) => r.lat === lat && r.lng === lng,
    )
    expect(exact.length).toBe(0)
  })
})

// ─── viewportKey ────────────────────────────────────────────────────────────

describe('LocationService viewportKey', () => {
  type VK = (q: { swLat: number; swLng: number; neLat: number; neLng: number }) => string

  it('produces identical keys for nearby coordinates within the same bucket', () => {
    const { service } = buildService()
    const vk = (service as unknown as { viewportKey: VK }).viewportKey.bind(service)

    const k1 = vk({ swLat: 33.4484, swLng: -112.074, neLat: 33.5001, neLng: -112.0001 })
    const k2 = vk({ swLat: 33.44845, swLng: -112.07395, neLat: 33.50014, neLng: -112.00005 })
    expect(k1).toBe(k2)
  })

  it('produces different keys for different cities', () => {
    const { service } = buildService()
    const vk = (service as unknown as { viewportKey: VK }).viewportKey.bind(service)

    const phoenix = vk({ swLat: 33.44, swLng: -112.07, neLat: 33.5, neLng: -112.0 })
    const nyc = vk({ swLat: 40.7, swLng: -74.01, neLat: 40.75, neLng: -73.96 })
    expect(phoenix).not.toBe(nyc)
  })
})

// ─── updateLocation ─────────────────────────────────────────────────────────

describe('LocationService.updateLocation', () => {
  it('throws 429 when rate limit is exceeded', async () => {
    const redis = makeRedis()
    redis.incr.mockResolvedValue(601)
    const prisma = makePrisma()
    prisma.userLocation.findUnique.mockResolvedValue({
      travelMode: false,
      travelLat: null,
      travelLng: null,
    })
    const { service } = buildService({ prisma, redis })

    await expect(
      service.updateLocation('user-1', { latitude: 33.44, longitude: -112.07 }),
    ).rejects.toThrow()
  })

  it('uses travel coordinates when travel mode is active', async () => {
    const redis = makeRedis()
    redis.incr.mockResolvedValue(1)
    const prisma = makePrisma()
    prisma.userLocation.findUnique.mockResolvedValue({
      travelMode: true,
      travelLat: 40.7128,
      travelLng: -74.006,
    })
    const { service } = buildService({ prisma, redis })

    await service.updateLocation('user-1', { latitude: 33.44, longitude: -112.07 })

    const upsertArg = prisma.userLocation.upsert.mock.calls[0]?.[0] as {
      update: { latitude: number; longitude: number }
    }
    expect(upsertArg?.update?.latitude).toBe(40.7128)
    expect(upsertArg?.update?.longitude).toBe(-74.006)
  })
})

// ─── setTravelMode ──────────────────────────────────────────────────────────

describe('LocationService.setTravelMode', () => {
  it('throws BadRequestException when enabling without coordinates', async () => {
    const { service } = buildService()
    await expect(service.setTravelMode('user-1', true)).rejects.toThrow(BadRequestException)
  })

  it('does not throw when enabling with valid coordinates', async () => {
    const { service } = buildService()
    await expect(service.setTravelMode('user-1', true, 40.7128, -74.006)).resolves.not.toThrow()
  })
})

// ─── seeded-user visibility window ──────────────────────────────────────────

describe('LocationService seeded-user visibility', () => {
  const viewport = { swLat: 33.4, swLng: -112.1, neLat: 33.5, neLng: -112.0 } as never

  function sqlTextFrom(prisma: ReturnType<typeof makePrisma>): string {
    const arg = prisma.$queryRaw.mock.calls[0]?.[0] as { strings?: string[] } | undefined
    return (arg?.strings ?? []).join(' ')
  }

  it('exempts seeded users from the recency window when the flag is on', async () => {
    const { service, prisma } = buildService({ config: makeConfig(true) })
    await service.getMapUsers(null, viewport)
    const sql = sqlTextFrom(prisma)
    expect(sql).toContain('u.is_seeded OR')
    expect(sql).toContain("INTERVAL '3 days'")
  })

  it('applies the recency window to everyone when the flag is off', async () => {
    const { service, prisma } = buildService({ config: makeConfig(false) })
    await service.getMapUsers(null, viewport)
    const sql = sqlTextFrom(prisma)
    expect(sql).not.toContain('u.is_seeded OR')
    expect(sql).toContain("INTERVAL '3 days'")
  })
})
