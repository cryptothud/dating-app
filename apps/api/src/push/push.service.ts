import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import webpush from 'web-push'
import { PrismaService } from '../prisma/prisma.service'
import type { Env } from '../config/configuration'
import type { PushSubscribeDto } from './dto/push-subscribe.dto'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name)
  private enabled = false

  constructor(
    private prisma: PrismaService,
    private config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    const pub = this.config.get('VAPID_PUBLIC_KEY', { infer: true })
    const priv = this.config.get('VAPID_PRIVATE_KEY', { infer: true })
    const email = this.config.get('VAPID_EMAIL', { infer: true })
    if (pub && priv) {
      webpush.setVapidDetails(email, pub, priv)
      this.enabled = true
    } else {
      this.logger.warn('VAPID keys not set — Web Push disabled')
    }
  }

  getVapidPublicKey(): string | null {
    return this.config.get('VAPID_PUBLIC_KEY', { infer: true }) ?? null
  }

  async subscribe(userId: string, dto: PushSubscribeDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: dto.endpoint } },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
      },
      update: {
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
      },
    })
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    })
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) return
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } })
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
            JSON.stringify(payload),
          )
        } catch (err: unknown) {
          // 410 Gone = subscription expired — clean it up
          if ((err as { statusCode?: number }).statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
        }
      }),
    )
  }
}
