import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SafetyService } from './safety.service'
import { CreateSafetyDateDto } from './dto/create-safety-date.dto'

interface AuthRequest extends Request {
  user: { id: string }
}

@Controller('track')
export class TrackController {
  constructor(private safety: SafetyService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getTrackingInfo(@Param('token') token: string): Promise<object> {
    return this.safety.getTrackingInfo(token)
  }
}

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private safety: SafetyService) {}

  @Post('dates')
  async create(@Req() req: AuthRequest, @Body() dto: CreateSafetyDateDto): Promise<object> {
    return this.safety.createSafetyDate(req.user.id, dto)
  }

  @Get('dates/active')
  async getActive(@Req() req: AuthRequest): Promise<object | null> {
    return this.safety.getActiveSafetyDate(req.user.id)
  }

  @Post('dates/:id/checkin')
  @HttpCode(HttpStatus.OK)
  async checkin(@Req() req: AuthRequest, @Param('id') id: string): Promise<object> {
    return this.safety.checkin(req.user.id, id)
  }

  @Post('dates/:id/sos')
  @HttpCode(HttpStatus.OK)
  async sos(@Req() req: AuthRequest, @Param('id') id: string): Promise<object> {
    return this.safety.sos(req.user.id, id)
  }

  @Delete('dates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async end(@Req() req: AuthRequest, @Param('id') id: string): Promise<void> {
    await this.safety.endSafetyDate(req.user.id, id)
  }
}
