import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { EmailService } from '../email/email.service'
import type { ReportDto } from './dto/report.dto'

const REPORT_WINDOW = 86400
const AUTO_SUSPEND_THRESHOLD = 3

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private email: EmailService,
  ) {}

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) throw new ConflictException('Cannot block yourself')
    const target = await this.prisma.user.findUnique({ where: { id: blockedId } })
    if (!target) throw new NotFoundException('User not found')

    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    })
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } })
  }

  async getBlockedUsers(userId: string): Promise<{ id: string; displayName: string | null }[]> {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    return blocks.map((b): { id: string; displayName: string | null } => ({
      id: b.blocked.id,
      displayName: b.blocked.profile?.displayName ?? null,
    }))
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!user) return
    // Invalidate all sessions before deleting
    await this.redis.set(
      `sessions:invalidated_before:${userId}`,
      Date.now().toString(),
      60 * 60 * 24 * 8,
    )
    await this.prisma.user.delete({ where: { id: userId } })
    void this.email.sendAccountDeleted(user.email)
  }

  async setIncognito(userId: string, enabled: boolean): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { incognito: enabled } })
  }

  async reportUser(reporterId: string, reportedId: string, dto: ReportDto): Promise<void> {
    if (reporterId === reportedId) throw new ConflictException('Cannot report yourself')
    const target = await this.prisma.user.findUnique({
      where: { id: reportedId },
      select: { id: true, email: true },
    })
    if (!target) throw new NotFoundException('User not found')

    await this.prisma.report.create({
      data: { reporterId, reportedId, reason: dto.reason, details: dto.details },
    })

    const countKey = `reports:${reportedId}`
    const count = await this.redis.incr(countKey, REPORT_WINDOW)

    if (count >= AUTO_SUSPEND_THRESHOLD) {
      const alreadySuspended = await this.prisma.user.findUnique({
        where: { id: reportedId },
        select: { suspended: true },
      })
      if (!alreadySuspended?.suspended) {
        await this.prisma.user.update({
          where: { id: reportedId },
          data: { suspended: true },
        })
        void this.email.sendAccountSuspended(
          target.email,
          'Your account received multiple reports and has been suspended pending review.',
        )
      }
    }
  }
}
