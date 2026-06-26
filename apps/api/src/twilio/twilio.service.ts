import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Twilio from 'twilio'
import type { Env } from '../config/configuration'

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name)
  private client: ReturnType<typeof Twilio> | null = null
  private readonly verifySid: string | undefined

  constructor(private config: ConfigService<Env, true>) {
    const sid = this.config.get('TWILIO_ACCOUNT_SID')
    const token = this.config.get('TWILIO_AUTH_TOKEN')
    this.verifySid = this.config.get('TWILIO_VERIFY_SERVICE_SID')

    if (sid && token) {
      this.client = Twilio(sid, token)
    } else {
      this.logger.warn('Twilio credentials not set — OTP will be mocked in development')
    }
  }

  async sendOtp(phone: string): Promise<void> {
    if (!this.client || !this.verifySid) {
      this.logger.debug(`[MOCK OTP] Phone: ${phone} — code: 000000`)
      return
    }
    await this.client.verify.v2.services(this.verifySid).verifications.create({
      to: phone,
      channel: 'sms',
    })
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    if (!this.client || !this.verifySid) {
      return code === '000000'
    }
    const result = await this.client.verify.v2
      .services(this.verifySid)
      .verificationChecks.create({ to: phone, code })
    return result.status === 'approved'
  }
}
