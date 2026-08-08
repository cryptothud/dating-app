import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { ProfileService } from './profile.service'
import type { ProfileResponse, PublicProfileResponse } from './profile.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpsertPromptDto } from './dto/upsert-prompt.dto'
import { PremiumService } from '../billing/premium.service'

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly premium: PremiumService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser): Promise<ProfileResponse> {
    return this.profile.getMyProfile(user.id)
  }

  @Get('me/viewers')
  async getViewers(@CurrentUser() user: AuthUser) {
    await this.premium.requirePremiumPlus(user.id)
    return this.profile.getProfileViewers(user.id)
  }

  @Get(':userId')
  getPublicProfile(
    @Param('userId') userId: string,
    @CurrentUser() requestingUser: AuthUser,
  ): Promise<PublicProfileResponse> {
    void this.profile.recordProfileView(userId, requestingUser.id)
    return this.profile.getPublicProfile(userId, requestingUser.id)
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<ProfileResponse> {
    return this.profile.updateProfile(user.id, dto)
  }

  @Post('prompts')
  upsertPrompt(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPromptDto,
  ): Promise<{ id: string; promptKey: string; answer: string; order: number }> {
    return this.profile.upsertPrompt(user.id, dto)
  }

  @Delete('prompts/:id')
  deletePrompt(
    @CurrentUser() user: AuthUser,
    @Param('id') promptId: string,
  ): Promise<{ ok: true }> {
    return this.profile.deletePrompt(user.id, promptId).then(() => ({ ok: true as const }))
  }
}
