import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator'
import { SeenInWildService, type WildSighting } from './seen-in-wild.service'
import { PremiumService } from '../billing/premium.service'

@Controller('seen-in-wild')
@UseGuards(JwtAuthGuard)
export class SeenInWildController {
  constructor(
    private siw: SeenInWildService,
    private premium: PremiumService,
  ) {}

  @Get()
  async getSightings(@CurrentUser() user: AuthUser): Promise<WildSighting[]> {
    const { isPremium } = await this.premium.getStatus(user.id)
    return this.siw.getSightings(user.id, isPremium)
  }

  @Get('count')
  async getUnreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    const count = await this.siw.getUnreadCount(user.id)
    return { count }
  }

  @Post('mark-notified')
  async markNotified(
    @CurrentUser() user: AuthUser,
    @Body() body: { ids: string[] },
  ): Promise<void> {
    await this.siw.markNotified(user.id, body.ids)
  }
}
