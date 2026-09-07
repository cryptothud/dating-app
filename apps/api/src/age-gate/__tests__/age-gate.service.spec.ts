import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ConfigService } from '@nestjs/config'
import { AgeGateService } from '../age-gate.service'

// Direct instantiation — no NestJS DI container needed for unit tests

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string): string | undefined => values[key] } as ConfigService
}

function makeService(values: Record<string, string | undefined>): AgeGateService {
  const service = new AgeGateService(makeConfig(values))
  // Silence the expected warn/error logging in the failure paths
  vi.spyOn(service['logger'], 'warn').mockImplementation((): void => {})
  vi.spyOn(service['logger'], 'error').mockImplementation((): void => {})
  return service
}

function fetchCall(index: number): [string, RequestInit] {
  const mock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
  const call = mock.mock.calls[index]
  if (!call) throw new Error(`fetch was not called ${index + 1} time(s)`)
  return call as [string, RequestInit]
}

function mockFetch(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: (): Promise<unknown> => Promise.resolve(body),
      text: (): Promise<string> => Promise.resolve(JSON.stringify(body)),
    }),
  )
}

describe('AgeGateService.verifyTurnstile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bypasses verification outside production when no secret is set', async () => {
    const service = makeService({ NODE_ENV: 'development' })
    await expect(service.verifyTurnstile('any-token')).resolves.toEqual({
      success: true,
      errorCodes: [],
    })
  })

  it('fails closed in production when no secret is set', async () => {
    const service = makeService({ NODE_ENV: 'production' })
    await expect(service.verifyTurnstile('any-token')).resolves.toEqual({
      success: false,
      errorCodes: ['missing-secret'],
    })
  })

  it('accepts a token Cloudflare reports as valid', async () => {
    mockFetch({ success: true })
    const service = makeService({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'secret' })
    await expect(service.verifyTurnstile('good-token')).resolves.toEqual({
      success: true,
      errorCodes: [],
    })
  })

  it('rejects a token Cloudflare reports as invalid, surfacing its error codes', async () => {
    mockFetch({ success: false, 'error-codes': ['invalid-input-response'] })
    const service = makeService({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'secret' })
    await expect(service.verifyTurnstile('bad-token')).resolves.toEqual({
      success: false,
      errorCodes: ['invalid-input-response'],
    })
  })

  it('sends the secret, token and caller IP as form-encoded fields', async () => {
    mockFetch({ success: true })
    const service = makeService({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'secret' })
    await service.verifyTurnstile('tok', '203.0.113.7')

    const [url, init] = fetchCall(0)
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    const sent = new URLSearchParams(init.body as string)
    expect(sent.get('secret')).toBe('secret')
    expect(sent.get('response')).toBe('tok')
    expect(sent.get('remoteip')).toBe('203.0.113.7')
  })

  it('omits remoteip when the caller IP is unknown', async () => {
    mockFetch({ success: true })
    const service = makeService({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'secret' })
    await service.verifyTurnstile('tok')

    const [, init] = fetchCall(0)
    expect(new URLSearchParams(init.body as string).has('remoteip')).toBe(false)
  })

  it('fails closed when the siteverify request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    const service = makeService({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'secret' })
    await expect(service.verifyTurnstile('tok')).resolves.toEqual({
      success: false,
      errorCodes: ['network-error'],
    })
  })

  it('fails closed on a non-2xx response from Cloudflare', async () => {
    mockFetch({}, false, 500)
    const service = makeService({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'secret' })
    await expect(service.verifyTurnstile('tok')).resolves.toEqual({
      success: false,
      errorCodes: ['http-error'],
    })
  })
})
