import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { ProfileService } from './profile.service'
import type { ProfileResponse, PublicProfileResponse } from './profile.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpsertPromptDto } from './dto/upsert-prompt.dto'
import { PremiumService } from '../billing/premium.service'

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly premium: PremiumService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser): Promise<ProfileResponse> {
    return this.profile.getMyProfile(user.id)
  }

  @Get('me/viewers')
  @UseGuards(JwtAuthGuard)
  async getViewers(
    @CurrentUser() user: AuthUser,
  ): Promise<
    { id: string; displayName: string | null; photoUrl: string | null; viewedAt: string }[]
  > {
    await this.premium.requirePremiumPlus(user.id)
    return this.profile.getProfileViewers(user.id)
  }

  // Readable while signed out: anonymous visitors browse the map and open profiles.
  // The response carries only public profile fields, and NSFW photos stay blurred
  // because a signed-out viewer has no NSFW opt-in.
  @Get(':userId')
  @UseGuards(OptionalJwtAuthGuard)
  getPublicProfile(
    @Param('userId') userId: string,
    @CurrentUser() requestingUser: AuthUser | null,
  ): Promise<PublicProfileResponse> {
    if (requestingUser) void this.profile.recordProfileView(userId, requestingUser.id)
    return this.profile.getPublicProfile(userId, requestingUser?.id ?? null)
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<ProfileResponse> {
    return this.profile.updateProfile(user.id, dto)
  }

  @Post('prompts')
  @UseGuards(JwtAuthGuard)
  upsertPrompt(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPromptDto,
  ): Promise<{ id: string; promptKey: string; answer: string; order: number }> {
    return this.profile.upsertPrompt(user.id, dto)
  }

  @Delete('prompts/:id')
  @UseGuards(JwtAuthGuard)
  deletePrompt(
    @CurrentUser() user: AuthUser,
    @Param('id') promptId: string,
  ): Promise<{ ok: true }> {
    return this.profile
      .deletePrompt(user.id, promptId)
      .then((): { ok: true } => ({ ok: true as const }))
  }
}
