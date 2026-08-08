import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Request } from 'express'
import type { RefreshTokenPayload } from '@dating-app/types'
import { RedisService } from '../../redis/redis.service'
import type { Env } from '../../config/configuration'

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService<Env, true>,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => req.cookies?.['refresh_token'] as string | null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    })
  }

  async validate(
    _req: Request,
    payload: RefreshTokenPayload,
  ): Promise<{ id: string; family: string }> {
    // Check if this token family has been invalidated (reuse detection)
    const invalidated = await this.redis.exists(`rt:invalidated:${payload.family}`)
    if (invalidated) throw new UnauthorizedException('Token reuse detected')

    // Check if ALL sessions were invalidated after a password reset
    const invalidatedBeforeRaw = await this.redis.get(`sessions:invalidated_before:${payload.sub}`)
    if (invalidatedBeforeRaw) {
      const tokenIssuedAt = (payload.iat ?? 0) * 1000
      if (tokenIssuedAt < parseInt(invalidatedBeforeRaw)) {
        throw new UnauthorizedException('Session expired — please log in again')
      }
    }

    return { id: payload.sub, family: payload.family }
  }
}
