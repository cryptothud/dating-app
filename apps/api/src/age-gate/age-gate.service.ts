import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const SITEVERIFY_TIMEOUT_MS = 5000

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
  hostname?: string
  challenge_ts?: string
}

export interface TurnstileResult {
  success: boolean
  errorCodes: string[]
}

@Injectable()
export class AgeGateService {
  private readonly logger = new Logger(AgeGateService.name)

  constructor(private readonly config: ConfigService) {}

  async verifyTurnstile(token: string, remoteIp?: string): Promise<TurnstileResult> {
    // Same hazard as the sitekey: a secret pasted into a hosting dashboard can carry a
    // BOM or zero-width characters, which would fail siteverify for no visible reason.
    const secret = this.config
      .get<string>('TURNSTILE_SECRET_KEY')
      ?.replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()

    if (!secret) {
      // Without a secret there is nothing to check the token against. Locally that is
      // expected, so the gate opens and mirrors the frontend's dev bypass. In production
      // it means the challenge is unenforceable, so fail closed instead.
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.error('TURNSTILE_SECRET_KEY is not set — refusing to verify age-gate tokens')
        return { success: false, errorCodes: ['missing-secret'] }
      }
      this.logger.warn('TURNSTILE_SECRET_KEY is not set — age-gate verification bypassed (dev)')
      return { success: true, errorCodes: [] }
    }

    const body = new URLSearchParams({ secret, response: token })
    // Cloudflare uses the caller IP as an extra signal; it is optional and skipped
    // when Express cannot resolve one.
    if (remoteIp) body.set('remoteip', remoteIp)

    let res: Response
    try {
      res = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      })
    } catch (err) {
      this.logger.error(`Turnstile siteverify request failed: ${String(err)}`)
      return { success: false, errorCodes: ['network-error'] }
    }

    if (!res.ok) {
      const text = await res.text().catch((): string => '')
      this.logger.error(`Turnstile siteverify HTTP ${res.status}: ${text}`)
      return { success: false, errorCodes: ['http-error'] }
    }

    const data = (await res.json()) as SiteverifyResponse
    const errorCodes = data['error-codes'] ?? []

    if (!data.success) {
      this.logger.warn(`Turnstile token rejected: ${errorCodes.join(', ') || 'no error code'}`)
    }

    return { success: data.success, errorCodes }
  }
}
