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

function buildService(overrides: {
  prisma?: ReturnType<typeof makePrisma>
  redis?: ReturnType<typeof makeRedis>
} = {}) {
  const prisma = overrides.prisma ?? makePrisma()
  const redis = overrides.redis ?? makeRedis()
  const service = new LocationService(prisma as never, redis as never)
  return { service, prisma, redis }
}

// ─── fuzzCoordinates ────────────────────────────────────────────────────────

describe('LocationService fuzz coordinates', () => {
  it('keeps fuzzed point within the specified radius', () => {
    const { service } = buildService()
    const lat = 33.4484
    const lng = -112.0740
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

    const exact = Array.from({ length: 50 }, () => fuzz(lat, lng, 150))
      .filter((r) => r.lat === lat && r.lng === lng)
    expect(exact.length).toBe(0)
  })
})

// ─── viewportKey ────────────────────────────────────────────────────────────

describe('LocationService viewportKey', () => {
  type VK = (q: { swLat: number; swLng: number; neLat: number; neLng: number }) => string

  it('produces identical keys for nearby coordinates within the same bucket', () => {
    const { service } = buildService()
    const vk = (service as unknown as { viewportKey: VK }).viewportKey.bind(service)

    const k1 = vk({ swLat: 33.44840, swLng: -112.07400, neLat: 33.50010, neLng: -112.00010 })
    const k2 = vk({ swLat: 33.44845, swLng: -112.07395, neLat: 33.50014, neLng: -112.00005 })
    expect(k1).toBe(k2)
  })

  it('produces different keys for different cities', () => {
    const { service } = buildService()
    const vk = (service as unknown as { viewportKey: VK }).viewportKey.bind(service)

    const phoenix = vk({ swLat: 33.44, swLng: -112.07, neLat: 33.50, neLng: -112.00 })
    const nyc = vk({ swLat: 40.70, swLng: -74.01, neLat: 40.75, neLng: -73.96 })
    expect(phoenix).not.toBe(nyc)
  })
})

// ─── updateLocation ─────────────────────────────────────────────────────────

describe('LocationService.updateLocation', () => {
  it('throws 429 when rate limit is exceeded', async () => {
    const redis = makeRedis()
    redis.incr.mockResolvedValue(601)
    const prisma = makePrisma()
    prisma.userLocation.findUnique.mockResolvedValue({ travelMode: false, travelLat: null, travelLng: null } as never)
    const { service } = buildService({ prisma, redis })

    await expect(service.updateLocation('user-1', { latitude: 33.44, longitude: -112.07 })).rejects.toThrow()
  })

  it('uses travel coordinates when travel mode is active', async () => {
    const redis = makeRedis()
    redis.incr.mockResolvedValue(1)
    const prisma = makePrisma()
    prisma.userLocation.findUnique.mockResolvedValue({ travelMode: true, travelLat: 40.7128, travelLng: -74.006 } as never)
    const { service } = buildService({ prisma, redis })

    await service.updateLocation('user-1', { latitude: 33.44, longitude: -112.07 })

    const upsertArg = prisma.userLocation.upsert.mock.calls[0]?.[0] as { update: { latitude: number; longitude: number } }
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
