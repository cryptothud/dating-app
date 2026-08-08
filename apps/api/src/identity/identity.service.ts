import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name)
  private stripe: Stripe | null = null

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getStripe(): Stripe {
    if (this.stripe) return this.stripe
    const key = this.config.get<string>('STRIPE_SECRET_KEY')
    if (!key) throw new BadRequestException('Identity verification is not yet available')
    this.stripe = new Stripe(key)
    return this.stripe
  }

  async createSession(userId: string): Promise<{ url: string; sessionId: string }> {
    const stripe = this.getStripe()
    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'

    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      options: {
        document: {
          allowed_types: ['driving_license', 'passport', 'id_card'],
          require_id_number: true,
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: `${webUrl}/profile?verification=complete`,
    })

    await this.prisma.verification.upsert({
      where: { userId },
      create: { userId, stripeSessionId: session.id, stripeStatus: 'requires_input' },
      update: { stripeSessionId: session.id, stripeStatus: 'requires_input' },
    })

    return { url: session.url!, sessionId: session.id }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    const secret = this.config.get<string>('STRIPE_IDENTITY_WEBHOOK_SECRET')
    if (!secret) return

    let event: Stripe.Event
    try {
      event = this.getStripe().webhooks.constructEvent(rawBody, signature, secret)
    } catch {
      throw new BadRequestException('Invalid webhook signature')
    }

    const type = event.type as string
    if (type === 'identity.verification_session.verified') {
      await this.handleVerified(event.data.object as Stripe.Identity.VerificationSession)
    } else if (type === 'identity.verification_session.requires_input') {
      await this.handleRequiresInput(event.data.object as Stripe.Identity.VerificationSession)
    }
  }

  private async handleVerified(session: Stripe.Identity.VerificationSession): Promise<void> {
    const userId = session.metadata?.userId
    if (!userId) return

    const { verifiedDob, verifiedName } = await this.extractVerifiedData(session)

    await this.prisma.$transaction([
      this.prisma.verification.update({
        where: { userId },
        data: {
          stripeStatus: 'verified',
          status: 'approved',
          reviewedAt: new Date(),
          verifiedDob,
          verifiedName,
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { verified: true } }),
    ])

    this.logger.log(`User ${userId} identity verified via Stripe`)
  }

  private async handleRequiresInput(session: Stripe.Identity.VerificationSession): Promise<void> {
    const userId = session.metadata?.userId
    if (!userId) return
    await this.prisma.verification.update({
      where: { userId },
      data: { stripeStatus: 'requires_input' },
    })
  }

  private async extractVerifiedData(
    session: Stripe.Identity.VerificationSession,
  ): Promise<{ verifiedDob?: Date; verifiedName?: string }> {
    const reportRef = session.last_verification_report
    const reportId = typeof reportRef === 'string' ? reportRef : reportRef?.id
    if (!reportId) return {}

    try {
      const report = await this.getStripe().identity.verificationReports.retrieve(reportId)
      const dob = report.document?.dob
      const firstName = report.document?.first_name
      const lastName = report.document?.last_name

      const verifiedDob =
        dob?.year && dob?.month && dob?.day ? new Date(dob.year, dob.month - 1, dob.day) : undefined
      const verifiedName =
        firstName || lastName ? `${firstName ?? ''} ${lastName ?? ''}`.trim() : undefined

      return { verifiedDob, verifiedName }
    } catch (err) {
      this.logger.warn(`Could not retrieve verification report ${reportId}: ${String(err)}`)
      return {}
    }
  }
}
