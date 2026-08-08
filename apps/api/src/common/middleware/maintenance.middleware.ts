import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { RedisService } from '../../redis/redis.service'

// Check both with and without /api prefix — NestJS middleware may strip the global
// prefix from req.path depending on how the router mounts it.
// /auth/me is allowed so admins can verify their session after logging in via /admin/auth/login.
const ALLOWED_PREFIXES = ['/admin', '/health', '/auth/refresh', '/auth/me']

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private redis: RedisService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // req.path is always '/' when mounted via forRoutes('*') — use originalUrl instead.
    const url = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? ''
    const isAllowed = ALLOWED_PREFIXES.some((p): boolean => url.startsWith(p) || url.startsWith('/api' + p))
    if (isAllowed) {
      next()
      return
    }
    const mode = await this.redis.get('system:maintenance')
    if (mode === '1') {
      throw new ServiceUnavailableException({
        maintenance: true,
        message: "We'll be right back.",
      })
    }
    next()
  }
}
