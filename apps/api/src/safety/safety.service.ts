import {
  Injectable, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { TwilioService } from '../twilio/twilio.service'
import { EmailService } from '../email/email.service'
import type { Env } from '../config/configuration'
import type { CreateSafetyDateDto } from './dto/create-safety-date.dto'

@Injectable()
export class SafetyService implements OnModuleInit, OnModuleDestroy {
  private checkinInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private prisma: PrismaService,
    private twilio: TwilioService,
    private email: EmailService,
    private config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    // Check for missed check-ins every 2 minutes
    this.checkinInterval = setInterval(() => { void this.checkMissedCheckins() }, 2 * 60 * 1000)
  }

  onModuleDestroy(): void {
    if (this.checkinInterval) clearInterval(this.checkinInterval)
  }

  async createSafetyDate(userId: string, dto: CreateSafetyDateDto): Promise<object> {
    if (!dto.trustedContactPhone && !dto.trustedContactEmail) {
      throw new BadRequestException('Provide a trusted contact phone or email')
    }

    const existing = await this.prisma.safetyDate.findFirst({
      where: { userId, endedAt: null },
    })
    if (existing) throw new BadRequestException('A safety date session is already active')

    const checkinAt = new Date(Date.now() + dto.durationMinutes * 60 * 1000)
    const trackToken = randomUUID()

    const safetyDate = await this.prisma.safetyDate.create({
      data: {
        userId,
        trackToken,
        trustedContactPhone: dto.trustedContactPhone,
        trustedContactEmail: dto.trustedContactEmail,
        checkinAt,
        durationMinutes: dto.durationMinutes,
      },
    })

    const trackUrl = `${this.config.get('WEB_URL')}/track/${trackToken}`
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { displayName: true } } },
    })
    const name = user?.profile?.displayName ?? 'Someone'
    const message = `${name} is on a date and shared their live location with you for safety. Track them here: ${trackUrl}`

    if (dto.trustedContactPhone) {
      void this.twilio.sendSms(dto.trustedContactPhone, message)
    }
    if (dto.trustedContactEmail) {
      void this.email.sendSafetyDateStarted(dto.trustedContactEmail, name, trackUrl, checkinAt.toLocaleString())
    }

    return this.formatSafetyDate(safetyDate)
  }

  async getActiveSafetyDate(userId: string): Promise<object | null> {
    const session = await this.prisma.safetyDate.findFirst({
      where: { userId, endedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return session ? this.formatSafetyDate(session) : null
  }

  async checkin(userId: string, id: string): Promise<object> {
    const session = await this.prisma.safetyDate.findFirst({
      where: { id, userId, endedAt: null },
    })
    if (!session) throw new NotFoundException('Safety date session not found')

    const updated = await this.prisma.safetyDate.update({
      where: { id },
      data: { endedAt: new Date() },
    })
    return this.formatSafetyDate(updated)
  }

  async sos(userId: string, id: string): Promise<object> {
    const session = await this.prisma.safetyDate.findFirst({
      where: { id, userId, endedAt: null, sosTriggered: false },
    })
    if (!session) throw new NotFoundException('No active safety date found or SOS already triggered')

    const updated = await this.prisma.safetyDate.update({
      where: { id },
      data: { sosTriggered: true, alertSent: true },
    })

    const trackUrl = `${this.config.get('WEB_URL')}/track/${session.trackToken}`
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { displayName: true } } },
    })
    const name = user?.profile?.displayName ?? 'Someone'
    const sosMsg = `🚨 SOS ALERT: ${name} has triggered an emergency alert. Track their live location: ${trackUrl}`

    if (session.trustedContactPhone) {
      void this.twilio.sendSms(session.trustedContactPhone, sosMsg)
    }
    if (session.trustedContactEmail) {
      void this.email.sendSafetyDateSos(session.trustedContactEmail, name, trackUrl)
    }

    return this.formatSafetyDate(updated)
  }

  async endSafetyDate(userId: string, id: string): Promise<void> {
    const session = await this.prisma.safetyDate.findFirst({
      where: { id, userId, endedAt: null },
    })
    if (!session) throw new NotFoundException('Safety date session not found')
    await this.prisma.safetyDate.update({ where: { id }, data: { endedAt: new Date() } })
  }

  async getTrackingInfo(trackToken: string): Promise<object> {
    const session = await this.prisma.safetyDate.findUnique({
      where: { trackToken },
      include: { user: { select: { profile: { select: { displayName: true } }, location: true } } },
    })
    if (!session) throw new NotFoundException('Tracking link not found or expired')

    const ended = session.endedAt !== null
    const loc = ended ? null : session.user.location // stop sharing location once session ends
    return {
      name: session.user.profile?.displayName ?? 'Unknown',
      lat: loc ? this.fuzz(loc.latitude, loc.fuzzRadius) : null,
      lng: loc ? this.fuzz(loc.longitude, loc.fuzzRadius) : null,
      updatedAt: loc?.updatedAt?.toISOString() ?? null,
      checkinAt: session.checkinAt.toISOString(),
      sosTriggered: session.sosTriggered,
      ended,
    }
  }

  private async checkMissedCheckins(): Promise<void> {
    const overdue = await this.prisma.safetyDate.findMany({
      where: {
        endedAt: null,
        sosTriggered: false,
        alertSent: false,
        checkinAt: { lt: new Date() },
      },
      include: { user: { select: { profile: { select: { displayName: true } }, location: true } } },
    })

    for (const session of overdue) {
      await this.prisma.safetyDate.update({ where: { id: session.id }, data: { alertSent: true } })

      const trackUrl = `${this.config.get('WEB_URL')}/track/${session.trackToken}`
      const name = session.user.profile?.displayName ?? 'Someone'
      const msg = `⚠️ ${name} missed their check-in time. Please check on them. Track their last known location: ${trackUrl}`

      if (session.trustedContactPhone) void this.twilio.sendSms(session.trustedContactPhone, msg)
      if (session.trustedContactEmail) void this.email.sendSafetyDateMissedCheckin(session.trustedContactEmail, name, trackUrl)
    }
  }

  private fuzz(coord: number, radiusMeters: number): number {
    const deg = (radiusMeters / 111320) * (Math.random() - 0.5)
    return coord + deg
  }

  private formatSafetyDate(s: {
    id: string; trackToken: string; checkinAt: Date; durationMinutes: number
    endedAt: Date | null; sosTriggered: boolean; createdAt: Date
  }): object {
    return {
      id: s.id,
      trackToken: s.trackToken,
      checkinAt: s.checkinAt.toISOString(),
      durationMinutes: s.durationMinutes,
      endedAt: s.endedAt?.toISOString() ?? null,
      sosTriggered: s.sosTriggered,
      createdAt: s.createdAt.toISOString(),
    }
  }
}
