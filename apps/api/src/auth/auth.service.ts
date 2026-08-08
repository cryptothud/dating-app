import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Response } from 'express'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { TwilioService } from '../twilio/twilio.service'
import { EmailService } from '../email/email.service'
import { TRUST_SCORE_VALUES } from '@dating-app/types'
import type { JwtPayload, RefreshTokenPayload } from '@dating-app/types'
import type { SignupDto } from './dto/signup.dto'
import type { LoginDto } from './dto/login.dto'
import type { Env } from '../config/configuration'

const BCRYPT_ROUNDS = 12
const PW_RESET_TTL = 900 // 15 min
const pwResetKey = (token: string): string => `pw:reset:${token}`
const OTP_RATE_LIMIT_KEY = (phone: string): string => `otp:rl:${phone}`
const OTP_IP_RATE_LIMIT_KEY = (ip: string): string => `otp:ip:${ip}`
const LOGIN_ATTEMPT_KEY = (email: string): string => `login:attempts:${email}`
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_SECONDS = 900 // 15 min
const IS_DEV = process.env['NODE_ENV'] !== 'production'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private twilio: TwilioService,
    private email: EmailService,
    private jwt: JwtService,
    private config: ConfigService<Env, true>,
  ) {}

  async signup(dto: SignupDto, res: Response, ip: string): Promise<{ message: string }> {
    const dob = new Date(dto.dateOfBirth)
    const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    if (ageYears < 18) {
      throw new ForbiddenException('You must be 18 or older to create an account')
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    })
    if (existing) {
      throw new ConflictException('An account with this email or phone already exists')
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash: hash,
        dateOfBirth: dob,
        trustScore: 0,
      },
    })

    await this.sendOtp(dto.phone, ip)
    this.setAuthCookies(res, await this.generateTokens(user.id, user.email))

    // Fire-and-forget — don't block signup if email fails
    void this.email.sendWelcome(user.email)

    return { message: 'Account created. Please verify your phone number.' }
  }

  async login(dto: LoginDto, res: Response): Promise<{ message: string }> {
    const attemptKey = LOGIN_ATTEMPT_KEY(dto.email)
    const attempts = await this.redis.get(attemptKey)
    if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
      const ttl = await this.redis.ttl(attemptKey)
      throw new ForbiddenException(`Account locked. Try again in ${Math.ceil(ttl / 60)} minutes.`)
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) {
      await this.redis.incr(attemptKey, LOGIN_LOCKOUT_SECONDS)
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.passwordHash) throw new UnauthorizedException('Invalid credentials')
    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      await this.redis.incr(attemptKey, LOGIN_LOCKOUT_SECONDS)
      throw new UnauthorizedException('Invalid credentials')
    }

    await this.redis.del(attemptKey)
    await this.prisma.user.update({ where: { id: user.id }, data: { lastActive: new Date() } })

    this.setAuthCookies(res, await this.generateTokens(user.id, user.email, user.verified))
    return { message: 'Logged in successfully' }
  }

  async logout(userId: string, family: string, res: Response): Promise<{ message: string }> {
    // Invalidate the entire refresh token family
    await this.redis.set(`rt:invalidated:${family}`, '1', 60 * 60 * 24 * 8) // 8 days
    this.clearAuthCookies(res)
    await this.prisma.user.update({ where: { id: userId }, data: { lastActive: new Date() } })
    return { message: 'Logged out' }
  }

  async refresh(userId: string, family: string, res: Response): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()

    // Rotate: invalidate old family, issue new tokens with new family
    await this.redis.set(`rt:invalidated:${family}`, '1', 60 * 60 * 24 * 8)
    this.setAuthCookies(res, await this.generateTokens(user.id, user.email, user.verified))
    return { message: 'Tokens refreshed' }
  }

  async sendOtp(phone: string, ip: string): Promise<{ message: string }> {
    if (!IS_DEV) {
      const phoneKey = OTP_RATE_LIMIT_KEY(phone)
      const ipKey = OTP_IP_RATE_LIMIT_KEY(ip)

      const phoneCount = await this.redis.incr(phoneKey, 3600)
      if (phoneCount > 3) {
        throw new BadRequestException(
          'Too many OTP requests for this phone number. Try again later.',
        )
      }

      const ipCount = await this.redis.incr(ipKey, 60)
      if (ipCount > 1) {
        throw new BadRequestException('Please wait before requesting another code.')
      }
    }

    await this.twilio.sendOtp(phone)
    return { message: 'Verification code sent' }
  }

  async verifyOtp(
    userId: string,
    phone: string,
    code: string,
    res: Response,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    if (user.phone !== phone) throw new BadRequestException('Phone number does not match account')

    const valid = await this.twilio.verifyOtp(phone, code)
    if (!valid) throw new BadRequestException('Invalid or expired verification code')

    if (!user.verified) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          verified: true,
          trustScore: { increment: TRUST_SCORE_VALUES.PHONE_VERIFIED },
        },
      })
    }

    // Reissue tokens with verified: true so middleware picks it up immediately
    this.setAuthCookies(res, await this.generateTokens(user.id, user.email, true))
    return { message: 'Phone verified successfully' }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!user.passwordHash) throw new BadRequestException('No password set on this account')
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Current password is incorrect')
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
    // Invalidate all active sessions so stolen refresh tokens can't be reused after a password change
    await this.redis.set(
      `sessions:invalidated_before:${userId}`,
      Date.now().toString(),
      60 * 60 * 24 * 8,
    )
    return { message: 'Password updated successfully' }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    // Always return the same response — don't leak whether the email exists
    if (!user || !user.passwordHash) {
      return { message: 'If an account exists, a reset link has been sent.' }
    }

    const token = randomUUID()
    await this.redis.set(pwResetKey(token), user.id, PW_RESET_TTL)
    void this.email.sendPasswordReset(email, token)
    return { message: 'If an account exists, a reset link has been sent.' }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const userId = await this.redis.get(pwResetKey(token))
    if (!userId) throw new BadRequestException('Reset link is invalid or has expired')

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
    await this.redis.del(pwResetKey(token))

    // Invalidate all active sessions so old refresh tokens can't be reused after a reset
    await this.redis.set(
      `sessions:invalidated_before:${userId}`,
      Date.now().toString(),
      60 * 60 * 24 * 8,
    )

    return { message: 'Password updated successfully' }
  }

  async getSocketToken(userId: string): Promise<{ token: string }> {
    const token = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get('JWT_SECRET', { infer: true }),
        expiresIn: '60s',
      },
    )
    return { token }
  }

  async getMe(userId: string): Promise<object> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        verified: true,
        trustScore: true,
        role: true,
        createdAt: true,
        lastActive: true,
      },
    })
    return user
  }

  private async generateTokens(
    userId: string,
    email: string,
    verified = false,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const family = randomUUID()

    const accessPayload: JwtPayload = { sub: userId, email, verified }
    const refreshPayload: RefreshTokenPayload = { sub: userId, family }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
      }),
    ])

    return { accessToken, refreshToken }
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production'
    // All browser API calls go through Next.js rewrites (same-origin), so Lax is fine everywhere.
    // The cookies land on the Vercel domain, not Railway, which is what the browser sees.
    const sameSite = 'lax'
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      maxAge: 15 * 60 * 1000, // 15 min
    })
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    })
  }

  private clearAuthCookies(res: Response): void {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production'
    res.clearCookie('access_token', { httpOnly: true, secure: isProd, sameSite: 'lax' })
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/auth',
    })
  }
}
