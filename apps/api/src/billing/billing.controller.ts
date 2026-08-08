import { Controller, Get, Post, Delete, Body, UseGuards, Request } from '@nestjs/common'
import { IsEnum, IsIn } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { BillingService } from './billing.service'
import type { SubscriptionStatus } from '@dating-app/types'

class CheckoutDto {
  @IsEnum(['premium', 'premium_plus'])
  tier!: string

  @IsIn(['monthly', 'annual'])
  interval!: string
}

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billing: BillingService) {}

  @Get('subscription')
  getSubscription(@Request() req: { user: { id: string } }): Promise<SubscriptionStatus> {
    return this.billing.getSubscription(req.user.id)
  }

  @Post('checkout')
  createCheckout(
    @Request() req: { user: { id: string; email: string } },
    @Body() dto: CheckoutDto,
  ): Promise<{ url: string; }> {
    return this.billing.createCheckoutSession(req.user.id, req.user.email, dto.tier, dto.interval)
  }

  @Post('portal')
  createPortal(@Request() req: { user: { id: string } }): Promise<{ url: string; }> {
    return this.billing.createPortalSession(req.user.id)
  }

  @Delete('cancel')
  cancelSubscription(@Request() req: { user: { id: string } }): Promise<void> {
    return this.billing.cancelSubscription(req.user.id)
  }
}
