import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AuthService } from '../auth.service'

// Direct instantiation — no NestJS DI container needed for unit tests

function makePrisma() {
  return {
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  }
}

function makeRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    incr: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(0),
    exists: vi.fn().mockResolvedValue(false),
  }
}

function makeTwilio() {
  return {
    sendOtp: vi.fn().mockResolvedValue(undefined),
    verifyOtp: vi.fn().mockResolvedValue(true),
  }
}

function makeEmail() {
  return {
    sendWelcome: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn(),
  }
}

function makeJwt() {
  return { signAsync: vi.fn().mockResolvedValue('signed.token.value') }
}

function makeConfig() {
  const cfg: Record<string, unknown> = {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-at-least-32-characters-long',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'test-refresh-secret-32-characters-long',
    JWT_REFRESH_EXPIRES_IN: '7d',
  }
  return { get: vi.fn((k: string) => cfg[k]) }
}

function makeRes() {
  return { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as import('express').Response
}

// res.cookie is overloaded; vi.mocked resolves to the 2-arg signature, which hides
// the options argument. Read call args through this tuple to reach it.
type CookieCall = [name: string, val: string, options: Record<string, unknown>]

function cookieCalls(res: import('express').Response): CookieCall[] {
  return vi.mocked(res.cookie).mock.calls as unknown as CookieCall[]
}

function buildService(
  overrides: {
    prisma?: ReturnType<typeof makePrisma>
    redis?: ReturnType<typeof makeRedis>
    twilio?: ReturnType<typeof makeTwilio>
    email?: ReturnType<typeof makeEmail>
  } = {},
) {
  const prisma = overrides.prisma ?? makePrisma()
  const redis = overrides.redis ?? makeRedis()
  const twilio = overrides.twilio ?? makeTwilio()
  const email = overrides.email ?? makeEmail()
  const service = new AuthService(
    prisma as never,
    redis as never,
    twilio as never,
    email as never,
    makeJwt() as never,
    makeConfig() as never,
  )
  return { service, prisma, redis, twilio, email }
}

// ─── Signup ────────────────────────────────────────────────────────────────

describe('AuthService.signup', () => {
  it('throws ForbiddenException when user is under 18', async () => {
    const { service } = buildService()
    const dto = {
      email: 'young@test.com',
      phone: '+15550001111',
      password: 'Password1!',
      dateOfBirth: new Date().toISOString(),
    }
    await expect(service.signup(dto, makeRes(), '1.2.3.4')).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when user is exactly 17', async () => {
    const { service } = buildService()
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 17)
    const dto = {
      email: 'teen@test.com',
      phone: '+15550002222',
      password: 'Password1!',
      dateOfBirth: dob.toISOString(),
    }
    await expect(service.signup(dto, makeRes(), '1.2.3.4')).rejects.toThrow(ForbiddenException)
  })

  it('throws ConflictException when email already exists', async () => {
    const prisma = makePrisma()
    prisma.user.findFirst.mockResolvedValue({ id: 'existing' })
    const { service } = buildService({ prisma })

    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 25)
    const dto = {
      email: 'existing@test.com',
      phone: '+15550003333',
      password: 'Password1!',
      dateOfBirth: dob.toISOString(),
    }
    await expect(service.signup(dto, makeRes(), '1.2.3.4')).rejects.toThrow(ConflictException)
  })

  it('creates user and sends OTP when valid', async () => {
    const prisma = makePrisma()
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 'new-user', email: 'new@test.com' })
    const twilio = makeTwilio()
    const { service } = buildService({ prisma, twilio })

    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 25)
    const dto = {
      email: 'new@test.com',
      phone: '+15550004444',
      password: 'Password1!',
      dateOfBirth: dob.toISOString(),
    }
    const result = await service.signup(dto, makeRes(), '1.2.3.4')

    expect(result.message).toContain('verify')
    expect(prisma.user.create).toHaveBeenCalledOnce()
  })
})

// ─── Login ─────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  it('throws ForbiddenException when account is locked', async () => {
    const redis = makeRedis()
    redis.get.mockResolvedValue('5')
    redis.ttl.mockResolvedValue(600)
    const { service } = buildService({ redis })

    await expect(
      service.login({ email: 'locked@test.com', password: 'pw' }, makeRes()),
    ).rejects.toThrow(ForbiddenException)
  })

  it('throws UnauthorizedException when user not found', async () => {
    const prisma = makePrisma()
    prisma.user.findUnique.mockResolvedValue(null)
    const { service } = buildService({ prisma })

    await expect(
      service.login({ email: 'nobody@test.com', password: 'pw' }, makeRes()),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('increments Redis counter on wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10)
    const prisma = makePrisma()
    prisma.user.findUnique.mockResolvedValue({ id: '1', passwordHash: hash })
    const redis = makeRedis()
    const { service } = buildService({ prisma, redis })

    await expect(
      service.login({ email: 'user@test.com', password: 'wrong' }, makeRes()),
    ).rejects.toThrow(UnauthorizedException)
    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('login:attempts'),
      expect.any(Number),
    )
  })

  it('clears failed attempt counter on successful login', async () => {
    const hash = await bcrypt.hash('correct', 10)
    const prisma = makePrisma()
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'u@test.com',
      passwordHash: hash,
      verified: true,
    })
    prisma.user.update.mockResolvedValue({})
    const redis = makeRedis()
    const { service } = buildService({ prisma, redis })

    await service.login({ email: 'user@test.com', password: 'correct' }, makeRes())
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('login:attempts'))
  })
})

// ─── Forgot / Reset password ────────────────────────────────────────────────

describe('AuthService.forgotPassword', () => {
  it('returns identical message regardless of whether email exists', async () => {
    const prisma = makePrisma()
    prisma.user.findUnique.mockResolvedValue(null)
    const { service: s1 } = buildService({ prisma })
    const noUser = await s1.forgotPassword('nobody@test.com')

    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'real@test.com',
      passwordHash: 'hash',
    })
    const { service: s2 } = buildService({ prisma })
    const withUser = await s2.forgotPassword('real@test.com')

    expect(noUser.message).toBe(withUser.message)
  })
})

describe('AuthService.resetPassword', () => {
  it('throws BadRequestException when token not found in Redis', async () => {
    const redis = makeRedis()
    redis.get.mockResolvedValue(null)
    const { service } = buildService({ redis })

    await expect(service.resetPassword('bad-token', 'NewPass1!')).rejects.toThrow(
      BadRequestException,
    )
  })

  it('updates password and invalidates all sessions on valid token', async () => {
    const redis = makeRedis()
    redis.get.mockResolvedValue('user-id-123')
    const prisma = makePrisma()
    prisma.user.update.mockResolvedValue({})
    const { service } = buildService({ prisma, redis })

    await service.resetPassword('valid-token', 'NewPass1!')

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-id-123' } }),
    )
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('sessions:invalidated_before:user-id-123'),
      expect.any(String),
      expect.any(Number),
    )
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('valid-token'))
  })
})

// ─── Change password ────────────────────────────────────────────────────────

describe('AuthService.changePassword', () => {
  it('throws UnauthorizedException when current password is wrong', async () => {
    const hash = await bcrypt.hash('actual-password', 10)
    const prisma = makePrisma()
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: '1', passwordHash: hash })
    const { service } = buildService({ prisma })

    await expect(service.changePassword('1', 'wrong-password', 'NewPass1!')).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('hashes and saves new password when current is correct', async () => {
    const hash = await bcrypt.hash('current-password', 10)
    const prisma = makePrisma()
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: '1', passwordHash: hash })
    prisma.user.update.mockResolvedValue({})
    const { service } = buildService({ prisma })

    await service.changePassword('1', 'current-password', 'NewPass1!')

    const updateCall = prisma.user.update.mock.calls[0]?.[0] as { data: { passwordHash: string } }
    expect(updateCall?.data?.passwordHash).not.toBe(hash)
  })
})

// ─── Cookie security ────────────────────────────────────────────────────────

describe('AuthService cookie security', () => {
  it('sets refresh_token scoped to /api/auth/refresh', async () => {
    const hash = await bcrypt.hash('password', 10)
    const prisma = makePrisma()
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'u@test.com',
      passwordHash: hash,
      verified: true,
    })
    prisma.user.update.mockResolvedValue({})
    const { service } = buildService({ prisma })

    const res = makeRes()
    await service.login({ email: 'u@test.com', password: 'password' }, res)

    const refreshCall = cookieCalls(res).find((c) => c[0] === 'refresh_token')
    expect(refreshCall).toBeDefined()
    expect(refreshCall?.[2]).toMatchObject({ path: '/api/auth', httpOnly: true })
  })

  it('sets access_token without path restriction', async () => {
    const hash = await bcrypt.hash('password', 10)
    const prisma = makePrisma()
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'u@test.com',
      passwordHash: hash,
      verified: true,
    })
    prisma.user.update.mockResolvedValue({})
    const { service } = buildService({ prisma })

    const res = makeRes()
    await service.login({ email: 'u@test.com', password: 'password' }, res)

    const accessCall = cookieCalls(res).find((c) => c[0] === 'access_token')
    expect(accessCall?.[2]).toMatchObject({ httpOnly: true })
    expect(accessCall?.[2]?.['path']).toBeUndefined()
  })
})
