import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common'
import { IsBoolean } from 'class-validator'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsersService } from './users.service'
import { PremiumService, type PremiumStatus } from '../billing/premium.service'
import { ReportDto } from './dto/report.dto'

interface AuthRequest extends Request {
  user: { id: string }
}

class IncognitoDto {
  @IsBoolean()
  enabled!: boolean
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private users: UsersService,
    private premium: PremiumService,
  ) {}

  @Post(':id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async block(@Req() req: AuthRequest, @Param('id') id: string): Promise<void> {
    await this.users.blockUser(req.user.id, id)
  }

  @Delete(':id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@Req() req: AuthRequest, @Param('id') id: string): Promise<void> {
    await this.users.unblockUser(req.user.id, id)
  }

  @Get('blocked')
  async getBlocked(@Req() req: AuthRequest): Promise<{ id: string; displayName: string | null }[]> {
    return this.users.getBlockedUsers(req.user.id)
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  async report(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ReportDto,
  ): Promise<void> {
    await this.users.reportUser(req.user.id, id, dto)
  }

  @Patch('me/incognito')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setIncognito(@Req() req: AuthRequest, @Body() dto: IncognitoDto): Promise<void> {
    if (dto.enabled) await this.premium.requirePremium(req.user.id)
    await this.users.setIncognito(req.user.id, dto.enabled)
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Req() req: AuthRequest): Promise<void> {
    await this.users.deleteAccount(req.user.id)
  }

  @Get('me/premium')
  async getPremiumStatus(@Req() req: AuthRequest): Promise<PremiumStatus> {
    return this.premium.getStatus(req.user.id)
  }
}
