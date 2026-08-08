import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { EmailService } from '../email/email.service'
import { PushService } from '../push/push.service'
import { WarnBusService } from '../warn-bus/warn-bus.service'
import { AuditService } from './audit.service'
import type { Env } from '../config/configuration'

const MAINTENANCE_KEY = 'system:maintenance'
const STATS_CACHE_KEY = 'admin:stats'
const STATS_CACHE_TTL = 300 // 5 minutes
const PUSH_BATCH_SIZE = 50

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private email: EmailService,
    private push: PushService,
    private warnBus: WarnBusService,
    private audit: AuditService,
    private jwt: JwtService,
    private config: ConfigService<Env, true>,
  ) {}

  // ── Admin-only login (works during maintenance) ────────────────────

  async getMaintenanceStatus(): Promise<{ maintenance: boolean }> {
    const val = await this.redis.get(MAINTENANCE_KEY)
    return { maintenance: val === '1' }
  }

  async adminLogin(email: string, password: string, res: Response): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    if (user.role !== 'admin') throw new ForbiddenException('Admin access required')

    const family = randomUUID()
    const isProd = this.config.get('NODE_ENV') === 'production'
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, email: user.email },
        {
          secret: this.config.get('JWT_SECRET'),
          expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwt.signAsync(
        { sub: user.id, email: user.email, family },
        {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ])

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    })
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    })
    return { message: 'Logged in' }
  }

  // ── Dashboard ─────────────────────────────────────────────────────

  async getDashboardStats() {
    const cached = await this.redis.get(STATS_CACHE_KEY)
    if (cached) return JSON.parse(cached) as Record<string, unknown>

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      newUsersToday,
      onlineNow,
      activeSubscriptions,
      messagesTotal,
      openReports,
      openTickets,
      maintenanceMode,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isSeeded: false } }),
      this.prisma.user.count({ where: { isSeeded: false, createdAt: { gte: startOfDay } } }),
      this.prisma.user.count({
        where: { isSeeded: false, lastActive: { gte: new Date(Date.now() - 5 * 60_000) } },
      }),
      this.prisma.subscription.count({ where: { expiresAt: { gt: now }, cancelledAt: null } }),
      this.prisma.message.count(),
      this.prisma.report.count({ where: { status: 'open' } }),
      this.prisma.supportTicket.count({ where: { status: 'open' } }),
      this.redis.get(MAINTENANCE_KEY),
    ])

    const monthlySignups = await this.prisma.user.count({
      where: { isSeeded: false, createdAt: { gte: startOfMonth } },
    })

    const result = {
      totalUsers,
      newUsersToday,
      monthlySignups,
      onlineNow,
      activeSubscriptions,
      messagesTotal,
      openReports,
      openTickets,
      maintenanceMode: maintenanceMode === '1',
    }

    await this.redis.set(STATS_CACHE_KEY, JSON.stringify(result), STATS_CACHE_TTL)
    return result
  }

  // ── User Management ───────────────────────────────────────────────

  async searchUsers(query: string, limit = 20, offset = 0) {
    const where = query
      ? {
          OR: [
            { email: { contains: query, mode: 'insensitive' as const } },
            { phone: { contains: query } },
            { profile: { displayName: { contains: query, mode: 'insensitive' as const } } },
            { id: query },
          ],
          isSeeded: false,
        }
      : { isSeeded: false }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          verified: true,
          suspended: true,
          banned: true,
          role: true,
          createdAt: true,
          lastActive: true,
          timeoutUntil: true,
          profile: { select: { displayName: true } },
          subscription: { select: { tier: true, expiresAt: true } },
          _count: { select: { reportsReceived: true } },
        },
      }),
    ])
    return { total, users }
  }

  async getBannedUsers(limit = 20, offset = 0) {
    const where = { banned: true, isSeeded: false }
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          verified: true,
          banned: true,
          suspended: true,
          role: true,
          createdAt: true,
          timeoutUntil: true,
          banReason: true,
          profile: { select: { displayName: true } },
        },
      }),
    ])
    return { total, users }
  }

  async getTimedOutUsers(limit = 20, offset = 0) {
    const now = new Date()
    const where = { timeoutUntil: { gt: now }, isSeeded: false }
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { timeoutUntil: 'asc' },
        select: {
          id: true,
          email: true,
          verified: true,
          banned: true,
          suspended: true,
          role: true,
          createdAt: true,
          timeoutUntil: true,
          profile: { select: { displayName: true } },
        },
      }),
    ])
    return { total, users }
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        subscription: true,
        reportsReceived: { orderBy: { createdAt: 'desc' }, take: 10 },
        reportsGiven: { orderBy: { createdAt: 'desc' }, take: 5 },
        auditLogsTargeted: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async warnUser(adminId: string, userId: string, reason: string): Promise<void> {
    const user = await this.requireUser(userId)
    await this.prisma.user.update({ where: { id: userId }, data: { warnCount: { increment: 1 } } })
    await this.redis.set(
      `pending:warn:${userId}`,
      JSON.stringify({ reason, warnedAt: new Date().toISOString() }),
      7 * 24 * 60 * 60,
    )
    this.warnBus.emit('warn', userId, reason)
    void this.email.sendAccountSuspended(user.email, `Warning: ${reason}`)
    await this.audit.log(adminId, 'user.warn', userId, { reason })
  }

  async suspendUser(adminId: string, userId: string, reason: string): Promise<void> {
    const user = await this.requireUser(userId)
    await this.prisma.user.update({ where: { id: userId }, data: { suspended: true } })
    void this.email.sendAccountSuspended(user.email, reason)
    await this.audit.log(adminId, 'user.suspend', userId, { reason })
    await this.invalidateSessions(userId)
  }

  async unsuspendUser(adminId: string, userId: string): Promise<void> {
    await this.requireUser(userId)
    await this.prisma.user.update({ where: { id: userId }, data: { suspended: false } })
    await this.audit.log(adminId, 'user.unsuspend', userId)
  }

  async banUser(adminId: string, userId: string, reason: string): Promise<void> {
    await this.requireCanActOn(adminId, userId)
    const user = await this.requireUser(userId)
    await this.prisma.user.update({
      where: { id: userId },
      data: { banned: true, banReason: reason, suspended: false },
    })
    void this.email.sendAccountBanned(user.email, reason)
    await this.audit.log(adminId, 'user.ban', userId, { reason })
    await this.invalidateSessions(userId)
    this.invalidateStatsCache()
  }

  async unbanUser(adminId: string, userId: string): Promise<void> {
    await this.requireUser(userId)
    await this.prisma.user.update({
      where: { id: userId },
      data: { banned: false, banReason: null },
    })
    await this.audit.log(adminId, 'user.unban', userId)
  }

  async timeoutUser(adminId: string, userId: string, durationMinutes: number, reason?: string): Promise<void> {
    await this.requireCanActOn(adminId, userId)
    await this.requireUser(userId)
    const timeoutUntil = new Date(Date.now() + durationMinutes * 60_000)
    await this.prisma.user.update({ where: { id: userId }, data: { timeoutUntil } })
    await this.audit.log(adminId, 'user.timeout', userId, {
      durationMinutes,
      reason,
      until: timeoutUntil.toISOString(),
    })
  }

  async clearTimeout(adminId: string, userId: string): Promise<void> {
    await this.requireUser(userId)
    await this.prisma.user.update({ where: { id: userId }, data: { timeoutUntil: null } })
    await this.audit.log(adminId, 'user.timeout_cleared', userId)
  }

  async getElevatedUsers() {
    return this.prisma.user.findMany({
      where: { role: { in: ['admin', 'moderator'] } },
      select: {
        id: true,
        email: true,
        role: true,
        profile: { select: { displayName: true } },
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    })
  }

  async setUserRole(adminId: string, userId: string, role: string): Promise<void> {
    const user = await this.requireUser(userId)
    if (user.id === adminId) throw new BadRequestException('Cannot change your own role')
    await this.prisma.user.update({ where: { id: userId }, data: { role: role as never } })
    await this.audit.log(adminId, 'user.role_change', userId, { role })
  }

  async verifyUser(adminId: string, userId: string): Promise<void> {
    await this.requireUser(userId)
    await this.prisma.user.update({ where: { id: userId }, data: { verified: true } })
    await this.audit.log(adminId, 'user.verify', userId)
  }

  async forceLogout(adminId: string, userId: string): Promise<void> {
    await this.requireUser(userId)
    await this.invalidateSessions(userId)
    await this.audit.log(adminId, 'user.force_logout', userId)
  }

  // ── Moderation / Reports ──────────────────────────────────────────

  async getReports(status: string, limit = 20, offset = 0) {
    const where = status === 'all' ? {} : { status: status as never }
    const [total, reports] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          reporter: {
            select: { id: true, email: true, profile: { select: { displayName: true } } },
          },
          reported: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
              suspended: true,
              banned: true,
            },
          },
        },
      }),
    ])
    return { total, reports }
  }

  async resolveReport(adminId: string, reportId: string, resolution: string): Promise<void> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } })
    if (!report) throw new NotFoundException('Report not found')
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'resolved', resolvedAt: new Date() },
    })
    await this.audit.log(adminId, 'report.resolve', report.reportedId, { reportId, resolution })
    this.invalidateStatsCache()
  }

  // ── Support Inbox ─────────────────────────────────────────────────

  async getTickets(status: string, limit = 20, offset = 0) {
    const where = status === 'all' ? {} : { status: status as never }
    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              suspended: true,
              banned: true,
              _count: { select: { reportsReceived: true } },
            },
          },
          _count: { select: { replies: true } },
        },
      }),
    ])
    return { total, tickets }
  }

  async getTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            suspended: true,
            banned: true,
            profile: { select: { displayName: true } },
          },
        },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!ticket) throw new NotFoundException('Ticket not found')
    return ticket
  }

  async replyToTicket(adminId: string, ticketId: string, body: string): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new NotFoundException('Ticket not found')

    await this.prisma.supportTicketReply.create({ data: { ticketId, adminId, body } })
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'pending', updatedAt: new Date() },
    })
    void this.email.sendSupportReply(ticket.email, ticket.subject, body)
    await this.audit.log(adminId, 'ticket.reply', ticket.userId ?? undefined, { ticketId })
  }

  async updateTicketStatus(adminId: string, ticketId: string, status: string): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new NotFoundException('Ticket not found')
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: status as never },
    })
    await this.audit.log(adminId, 'ticket.status_change', ticket.userId ?? undefined, {
      ticketId,
      status,
    })
  }

  // ── System Controls ───────────────────────────────────────────────

  async getSystemStatus() {
    const maintenance = await this.redis.get(MAINTENANCE_KEY)
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
    return { maintenanceMode: maintenance === '1', flags }
  }

  async setMaintenanceMode(adminId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.redis.set(MAINTENANCE_KEY, '1')
      await this.audit.log(adminId, 'system.maintenance_on')
    } else {
      await this.redis.del(MAINTENANCE_KEY)
      await this.audit.log(adminId, 'system.maintenance_off')
    }
  }

  async flushCache(adminId: string, pattern: string): Promise<void> {
    if (!pattern) throw new BadRequestException('Pattern required')
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) await this.redis.delMany(keys)
    await this.audit.log(adminId, 'system.cache_flush', undefined, { pattern, count: keys.length })
  }

  async updateFlag(adminId: string, key: string, enabled: boolean, description?: string): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, description },
      update: { enabled, ...(description ? { description } : {}) },
    })
    await this.audit.log(adminId, 'flag.update', undefined, { key, enabled })
  }

  async broadcastPush(adminId: string, title: string, body: string, url?: string): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ['userId'],
    })

    // Process in batches to avoid thundering herd on the push service
    for (let i = 0; i < subs.length; i += PUSH_BATCH_SIZE) {
      const batch = subs.slice(i, i + PUSH_BATCH_SIZE)
      await Promise.allSettled(
        batch.map(({ userId }): Promise<void> => this.push.sendToUser(userId, { title, body, url })),
      )
    }

    await this.audit.log(adminId, 'system.broadcast_push', undefined, {
      title,
      recipients: subs.length,
    })
  }

  // ── Audit Log ─────────────────────────────────────────────────────

  async getAuditLog(opts: {
    adminId?: string
    action?: string
    targetUserId?: string
    limit: number
    offset: number
  }) {
    return this.audit.list(opts)
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async requireUser(userId: string): Promise<{ id: string; email: string; }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  // Enforce role hierarchy: actor must outrank target (admin > moderator > user).
  async requireCanActOn(actorId: string, targetId: string): Promise<void> {
    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: targetId }, select: { role: true } }),
    ])
    if (!actor || !target) throw new NotFoundException('User not found')
    const rank = (r: string): 0 | 1 | 2 => (r === 'admin' ? 2 : r === 'moderator' ? 1 : 0)
    if (rank(actor.role) <= rank(target.role)) {
      throw new ForbiddenException(
        'You cannot perform this action on a user with equal or higher role',
      )
    }
  }

  private async invalidateSessions(userId: string): Promise<void> {
    await this.redis.set(
      `sessions:invalidated_before:${userId}`,
      Date.now().toString(),
      60 * 60 * 24 * 8,
    )
  }

  private invalidateStatsCache(): void {
    void this.redis.del(STATS_CACHE_KEY)
  }
}
