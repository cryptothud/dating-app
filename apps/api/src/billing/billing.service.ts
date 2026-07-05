import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { PremiumService } from './premium.service'
import type { Env } from '../config/configuration'

// Stripe SDK v22 changed some field names; access runtime-proven fields via these local types
type SubPeriod = { id: string; current_period_end: number; cancel_at_period_end: boolean; metadata: Record<string, string> }
type InvoiceRaw = { subscription: string | null; amount_paid: number | null }

const TIER_NAMES: Record<string, string> = {
  premium: 'Premium',
  premium_plus: 'Premium+',
}

const TIER_AMOUNTS: Record<string, Record<string, string>> = {
  premium: { monthly: '$9.99/mo', annual: '$59.99/yr' },
  premium_plus: { monthly: '$19.99/mo', annual: '$119.99/yr' },
}

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null

  constructor(
    private config: ConfigService<Env, true>,
    private prisma: PrismaService,
    private email: EmailService,
    private premium: PremiumService,
  ) {
    const key = config.get('STRIPE_SECRET_KEY', { infer: true })
    if (key) this.stripe = new Stripe(key)
  }

  private getStripe(): Stripe {
    if (!this.stripe) throw new BadRequestException('Stripe not configured')
    return this.stripe
  }

  private getPriceId(tier: string, interval: string): string {
    const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}` as keyof Env
    const priceId = this.config.get(key as never, { infer: true }) as string | undefined
    if (!priceId) throw new BadRequestException(`No price configured for ${tier}/${interval}`)
    return priceId
  }

  // ── Subscription info ──────────────────────────────────────────────

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    })
    if (!sub) return { active: false, tier: null, expiresAt: null }
    const active = sub.expiresAt > new Date() && !sub.cancelledAt
    return {
      active,
      tier: sub.tier,
      expiresAt: sub.expiresAt.toISOString(),
      cancelledAt: sub.cancelledAt?.toISOString() ?? null,
    }
  }

  // ── Create Checkout Session ────────────────────────────────────────

  async createCheckoutSession(
    userId: string,
    email: string,
    tier: string,
    interval: string,
  ): Promise<{ url: string }> {
    const stripe = this.getStripe()
    const priceId = this.getPriceId(tier, interval)
    const webUrl = this.config.get('WEB_URL', { infer: true })

    let customerId: string | undefined
    const existing = await this.prisma.subscription.findUnique({ where: { userId } })
    if (existing?.stripeCustomerId) {
      customerId = existing.stripeCustomerId
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { userId, tier } },
      success_url: `${webUrl}/settings?billing=success`,
      cancel_url: `${webUrl}/upgrade?cancelled=1`,
      metadata: { userId, tier, interval },
    })

    if (!session.url) throw new BadRequestException('Failed to create checkout session')
    return { url: session.url }
  }

  // ── Customer Portal ────────────────────────────────────────────────

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const stripe = this.getStripe()
    const sub = await this.prisma.subscription.findUnique({ where: { userId } })
    if (!sub?.stripeCustomerId) throw new NotFoundException('No active subscription found')
    const webUrl = this.config.get('WEB_URL', { infer: true })

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${webUrl}/settings`,
    })
    return { url: session.url }
  }

  // ── Cancel Subscription ────────────────────────────────────────────

  async cancelSubscription(userId: string): Promise<void> {
    const stripe = this.getStripe()
    const sub = await this.prisma.subscription.findUnique({ where: { userId } })
    if (!sub?.stripeSubscriptionId) throw new NotFoundException('No active subscription')

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    await this.prisma.subscription.update({
      where: { userId },
      data: { cancelledAt: new Date() },
    })
    this.premium.invalidateCache(userId)

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (user) {
      void this.email.sendSubscriptionCancelled(user.email, sub.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
    }
  }

  // ── Webhook Handlers ───────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = this.getStripe()
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true })
    if (!secret) return

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch {
      throw new BadRequestException('Invalid webhook signature')
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await this.onInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await this.onInvoiceFailed(event.data.object as Stripe.Invoice)
        break
    }
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.['userId']
    const tier = session.metadata?.['tier']
    if (!userId || !tier || !session.subscription || !session.customer) return

    const stripe = this.getStripe()
    const stripeSubRaw = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as SubPeriod
    const periodEnd = new Date(stripeSubRaw.current_period_end * 1000)

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        expiresAt: periodEnd,
        stripeSubscriptionId: stripeSubRaw.id,
        stripeCustomerId: session.customer as string,
      },
      update: {
        tier,
        expiresAt: periodEnd,
        stripeSubscriptionId: stripeSubRaw.id,
        stripeCustomerId: session.customer as string,
        cancelledAt: null,
      },
    })
    this.premium.invalidateCache(userId)
  }

  private async onSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
    const raw = stripeSub as unknown as SubPeriod
    const userId = raw.metadata?.['userId']
    if (!userId) return
    const periodEnd = new Date(raw.current_period_end * 1000)
    const cancelled = raw.cancel_at_period_end ? new Date() : null

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: { expiresAt: periodEnd, cancelledAt: cancelled },
    })
    this.premium.invalidateCache(userId)
  }

  private async onSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
      include: { user: { select: { email: true } } },
    })
    if (!sub) return

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelledAt: new Date(), expiresAt: new Date() },
    })
    this.premium.invalidateCache(sub.userId)
    void this.email.sendSubscriptionCancelled(sub.user.email, 'now')
  }

  private async onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const inv = invoice as unknown as InvoiceRaw
    if (!inv.subscription) return
    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: inv.subscription },
      include: { user: { select: { email: true } } },
    })
    if (!sub) return

    const stripe = this.getStripe()
    const stripeSubRaw = await stripe.subscriptions.retrieve(inv.subscription) as unknown as SubPeriod
    const periodEnd = new Date(stripeSubRaw.current_period_end * 1000)

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { expiresAt: periodEnd, cancelledAt: null },
    })

    const amount = `$${((inv.amount_paid ?? 0) / 100).toFixed(2)}`
    const planName = TIER_NAMES[sub.tier] ?? sub.tier
    const tierKey = sub.tier.replace('+', '_plus').toLowerCase() as keyof typeof TIER_AMOUNTS
    const amountDisplay = TIER_AMOUNTS[tierKey]?.['monthly'] ?? amount

    void this.email.sendSubscriptionReceipt(
      sub.user.email,
      planName,
      amountDisplay,
      periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    )
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
    const inv = invoice as unknown as InvoiceRaw
    if (!inv.subscription) return
    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: inv.subscription },
      include: { user: { select: { email: true } } },
    })
    if (!sub) return
    void this.email.sendPaymentFailed(sub.user.email, TIER_NAMES[sub.tier] ?? sub.tier)
  }
}
