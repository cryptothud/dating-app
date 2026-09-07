import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AgeGateService } from './age-gate.service'
import { VerifyTurnstileDto } from './dto/verify-turnstile.dto'

// Deliberately unauthenticated — the age gate runs before a visitor has an account.
@Controller('age-gate')
export class AgeGateController {
  constructor(private readonly ageGate: AgeGateService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 }, medium: { limit: 20, ttl: 300000 } })
  async verify(@Body() dto: VerifyTurnstileDto, @Ip() ip: string): Promise<{ success: true }> {
    const result = await this.ageGate.verifyTurnstile(dto.token, ip)
    if (!result.success) {
      throw new BadRequestException('Verification failed. Please try again.')
    }
    return { success: true }
  }
}
