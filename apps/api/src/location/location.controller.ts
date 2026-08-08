import {
  Controller,
  Patch,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Request } from 'express'
import { IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator'
import { SkipThrottle } from '@nestjs/throttler'
import { LocationService } from './location.service'
import { PremiumService, type PremiumStatus } from '../billing/premium.service'
import { UpdateLocationDto } from './dto/update-location.dto'
import { MapQueryDto } from './dto/map-query.dto'
import { ActivelyLookingDto } from './dto/actively-looking.dto'
import { UpdateFuzzRadiusDto } from './dto/update-fuzz-radius.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard'
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator'
import type { MapUser } from '@dating-app/types'

class TravelModeDto {
  @IsBoolean()
  enabled!: boolean

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number
}

@Controller('location')
export class LocationController {
  constructor(
    private location: LocationService,
    private premium: PremiumService,
  ) {}

  @Patch()
  @UseGuards(JwtAuthGuard)
  @SkipThrottle() // service-level: 600/hr
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLocationDto,
  ): Promise<void> {
    await this.location.updateLocation(user.id, dto)
  }

  // Public — returns pre-aggregated cluster counts for zoom < 12 (no per-user limit)
  @Get('map/clusters')
  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  async getMapClusters(
    @Query() query: MapQueryDto,
    @Req() req: Request,
  ): Promise<Array<{ lat: number; lng: number; count: number }>> {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip
    return this.location.getClusterData(query, ip)
  }

  // Public — anonymous users can view the map; rate limiting enforced at service level
  @Get('map')
  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  async getMapUsers(
    @CurrentUser() user: AuthUser | null,
    @Query() query: MapQueryDto,
    @Req() req: Request,
  ): Promise<MapUser[]> {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip
    return this.location.getMapUsers(user?.id ?? null, query, ip)
  }

  @Patch('actively-looking')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async setActivelyLooking(
    @CurrentUser() user: AuthUser,
    @Body() dto: ActivelyLookingDto,
  ): Promise<void> {
    await this.location.setActivelyLooking(user.id, dto.enabled)
  }

  @Get('actively-looking')
  @UseGuards(JwtAuthGuard)
  async getActivelyLooking(
    @CurrentUser() user: AuthUser,
  ): Promise<{ enabled: boolean; expiresAt: Date | null }> {
    return this.location.getActivelyLookingStatus(user.id)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyLocation(@CurrentUser() user: AuthUser): Promise<{ lat: number; lng: number } | null> {
    return this.location.getMyLocation(user.id)
  }

  @Patch('fuzz-radius')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateFuzzRadius(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateFuzzRadiusDto,
  ): Promise<void> {
    await this.location.setFuzzRadius(user.id, dto.fuzzRadius)
  }

  @Patch('travel-mode')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async setTravelMode(@CurrentUser() user: AuthUser, @Body() dto: TravelModeDto): Promise<void> {
    await this.premium.requirePremiumPlus(user.id)
    await this.location.setTravelMode(user.id, dto.enabled, dto.lat, dto.lng)
  }

  @Post('boost')
  @UseGuards(JwtAuthGuard)
  async activateBoost(@CurrentUser() user: AuthUser): Promise<{ boostedUntil: string }> {
    const { isPremium, isPremiumPlus } = await this.premium.getStatus(user.id)
    if (!isPremium) await this.premium.requirePremium(user.id)
    const weeklyLimit = isPremiumPlus ? 3 : 1
    return this.location.activateBoost(user.id, weeklyLimit)
  }

  @Post('heartbeat')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(@CurrentUser() user: AuthUser): Promise<void> {
    await this.location.heartbeat(user.id)
  }

  @Get('premium-status')
  @UseGuards(JwtAuthGuard)
  async getPremiumStatus(@CurrentUser() user: AuthUser): Promise<PremiumStatus> {
    return this.premium.getStatus(user.id)
  }
}
