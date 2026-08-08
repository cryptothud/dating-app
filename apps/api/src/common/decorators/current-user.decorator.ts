import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common'
import type { Request } from 'express'

export interface AuthUser {
  id: string
  email: string
  role: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    return req.user ?? null
  },
)
