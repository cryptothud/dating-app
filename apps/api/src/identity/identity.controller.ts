import { Controller, Post, UseGuards, Headers, Req, RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { IdentityService } from './identity.service'

@Controller('identity')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('session')
  @UseGuards(JwtAuthGuard)
  async createSession(@CurrentUser() user: AuthUser): Promise<{ url: string; sessionId: string }> {
    return this.identity.createSession(user.id)
  }

  // No JwtAuthGuard — Stripe calls this, not the user
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ): Promise<{ received: true }> {
    const raw = req.rawBody?.toString() ?? ''
    await this.identity.handleWebhook(raw, sig)
    return { received: true }
  }
}
