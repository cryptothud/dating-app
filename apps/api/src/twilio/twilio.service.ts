import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Twilio from 'twilio'
import type { Env } from '../config/configuration'

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name)
  private client: ReturnType<typeof Twilio> | null = null
  private readonly verifySid: string | undefined

  constructor(private config: ConfigService<Env, true>) {
    const sid = this.config.get('TWILIO_ACCOUNT_SID', { infer: true })
    const token = this.config.get('TWILIO_AUTH_TOKEN', { infer: true })
    this.verifySid = this.config.get('TWILIO_VERIFY_SERVICE_SID', { infer: true })

    if (sid && token) {
      this.client = Twilio(sid, token)
    } else {
      this.logger.warn('Twilio credentials not set — OTP will be mocked in development')
    }
  }

  private get isProd(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production'
  }

  async sendOtp(phone: string): Promise<void> {
    if (!this.client || !this.verifySid) {
      if (this.isProd) {
        throw new ServiceUnavailableException('Phone verification is not configured')
      }
      this.logger.debug(`[MOCK OTP] Phone: ${phone} — code: 000000`)
      return
    }
    try {
      await this.client.verify.v2.services(this.verifySid).verifications.create({
        to: phone,
        channel: 'sms',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown Twilio error'
      this.logger.error(`Twilio sendOtp failed: ${msg}`)
      if (
        msg.includes('unverified') ||
        msg.includes('Caller ID') ||
        msg.includes('21608') ||
        msg.includes('21219')
      ) {
        throw new BadRequestException(
          'This number is not verified in your Twilio trial account. Add it at console.twilio.com → Verified Caller IDs.',
        )
      }
      throw new BadRequestException(`Could not send verification code: ${msg}`)
    }
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    if (!this.client || !this.verifySid) {
      if (this.isProd) {
        throw new ServiceUnavailableException('Phone verification is not configured')
      }
      return code === '000000'
    }
    const result = await this.client.verify.v2
      .services(this.verifySid)
      .verificationChecks.create({ to: phone, code })
    return result.status === 'approved'
  }

  async sendSms(to: string, body: string): Promise<void> {
    const from = this.config.get('TWILIO_PHONE_NUMBER', { infer: true })
    if (!this.client || !from) {
      this.logger.debug(`[MOCK SMS] To: ${to} — ${body}`)
      return
    }
    await this.client.messages.create({ to, from, body })
  }
}
