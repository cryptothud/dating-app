import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import React from 'react'
import type { Env } from '../config/configuration'
import { WelcomeEmail } from './templates/welcome'
import { PasswordResetEmail } from './templates/password-reset'
import { EmailVerificationEmail } from './templates/email-verification'
import { MessagesWaitingEmail } from './templates/messages-waiting'
import { SubscriptionReceiptEmail } from './templates/subscription-receipt'
import { SubscriptionCancelledEmail } from './templates/subscription-cancelled'
import { PaymentFailedEmail } from './templates/payment-failed'
import { AccountSuspendedEmail } from './templates/account-suspended'
import { AccountBannedEmail } from './templates/account-banned'
import { AccountDeletedEmail } from './templates/account-deleted'
import { SafetyDateStartedEmail, SafetyDateSosEmail, SafetyDateMissedCheckinEmail } from './templates/safety-date'
import { SupportReplyEmail } from './templates/support-reply'

@Injectable()
export class EmailService {
  private readonly resend: Resend | null
  private readonly from: string
  private readonly webUrl: string
  private readonly appealEmail = 'support@crush.app'

  constructor(private config: ConfigService<Env, true>) {
    const key = config.get('RESEND_API_KEY', { infer: true })
    this.resend = key ? new Resend(key) : null
    this.from = config.get('EMAIL_FROM', { infer: true })
    this.webUrl = config.get('WEB_URL', { infer: true })
  }

  private async send(to: string, subject: string, element: React.ReactElement): Promise<void> {
    if (!this.resend) return
    const html = await render(element)
    await this.resend.emails.send({ from: this.from, to, subject, html })
  }

  async sendWelcome(to: string, displayName?: string): Promise<void> {
    await this.send(
      to,
      'Welcome to CRUSH',
      React.createElement(WelcomeEmail, { displayName, mapUrl: `${this.webUrl}/map` }),
    )
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const resetUrl = `${this.webUrl}/reset-password?token=${token}`
    await this.send(
      to,
      'Reset your CRUSH password',
      React.createElement(PasswordResetEmail, { resetUrl }),
    )
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const verifyUrl = `${this.webUrl}/verify-email?token=${token}`
    await this.send(
      to,
      'Verify your CRUSH email address',
      React.createElement(EmailVerificationEmail, { verifyUrl }),
    )
  }

  async sendMessagesWaiting(to: string, senderName: string, conversationId: string): Promise<void> {
    const conversationUrl = `${this.webUrl}/messages/${conversationId}`
    await this.send(
      to,
      `${senderName} sent you a message`,
      React.createElement(MessagesWaitingEmail, { senderName, conversationUrl }),
    )
  }

  async sendSubscriptionReceipt(to: string, planName: string, amount: string, periodEnd: string): Promise<void> {
    await this.send(
      to,
      `Your CRUSH ${planName} receipt`,
      React.createElement(SubscriptionReceiptEmail, { planName, amount, periodEnd }),
    )
  }

  async sendSubscriptionCancelled(to: string, accessUntil: string): Promise<void> {
    const reactivateUrl = `${this.webUrl}/settings`
    await this.send(
      to,
      'Your CRUSH subscription has been cancelled',
      React.createElement(SubscriptionCancelledEmail, { accessUntil, reactivateUrl }),
    )
  }

  async sendPaymentFailed(to: string, planName: string): Promise<void> {
    const updateUrl = `${this.webUrl}/settings`
    await this.send(
      to,
      'Action needed: your CRUSH payment failed',
      React.createElement(PaymentFailedEmail, { planName, updateUrl }),
    )
  }

  async sendAccountSuspended(to: string, reason: string): Promise<void> {
    await this.send(
      to,
      'Your CRUSH account has been suspended',
      React.createElement(AccountSuspendedEmail, { reason, appealEmail: this.appealEmail }),
    )
  }

  async sendAccountBanned(to: string, reason: string): Promise<void> {
    await this.send(
      to,
      'Your CRUSH account has been permanently banned',
      React.createElement(AccountBannedEmail, { reason }),
    )
  }

  async sendSafetyDateStarted(to: string, name: string, trackUrl: string, checkinTime: string): Promise<void> {
    await this.send(
      to,
      `${name} shared their location with you for safety`,
      React.createElement(SafetyDateStartedEmail, { name, trackUrl, checkinTime }),
    )
  }

  async sendSafetyDateSos(to: string, name: string, trackUrl: string): Promise<void> {
    await this.send(
      to,
      `🚨 SOS Alert from ${name}`,
      React.createElement(SafetyDateSosEmail, { name, trackUrl }),
    )
  }

  async sendSafetyDateMissedCheckin(to: string, name: string, trackUrl: string): Promise<void> {
    await this.send(
      to,
      `⚠️ ${name} missed their safety check-in`,
      React.createElement(SafetyDateMissedCheckinEmail, { name, trackUrl }),
    )
  }

  async sendSupportReply(to: string, subject: string, replyBody: string): Promise<void> {
    await this.send(
      to,
      `Re: ${subject}`,
      React.createElement(SupportReplyEmail, { subject, replyBody }),
    )
  }

  async sendAccountDeleted(to: string): Promise<void> {
    const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
    await this.send(
      to,
      'Your CRUSH account has been deleted',
      React.createElement(AccountDeletedEmail, { recoveryDeadline: deadline }),
    )
  }
}
