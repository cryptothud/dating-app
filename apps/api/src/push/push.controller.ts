import { Controller, Post, Delete, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PushService } from './push.service'
import { PushSubscribeDto } from './dto/push-subscribe.dto'

interface AuthRequest extends Request { user: { id: string } }

@Controller('push')
export class PushController {
  constructor(private push: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey(): { key: string | null } {
    return { key: this.push.getVapidPublicKey() }
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async subscribe(@Req() req: AuthRequest, @Body() dto: PushSubscribeDto): Promise<void> {
    await this.push.subscribe(req.user.id, dto)
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@Req() req: AuthRequest, @Body() body: { endpoint: string }): Promise<void> {
    await this.push.unsubscribe(req.user.id, body.endpoint)
  }
}
