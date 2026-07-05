import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type AuditAction =
  | 'user.warn'
  | 'user.suspend'
  | 'user.unsuspend'
  | 'user.ban'
  | 'user.unban'
  | 'user.verify'
  | 'user.force_logout'
  | 'user.timeout'
  | 'user.timeout_cleared'
  | 'user.role_change'
  | 'report.resolve'
  | 'ticket.reply'
  | 'ticket.status_change'
  | 'system.maintenance_on'
  | 'system.maintenance_off'
  | 'system.cache_flush'
  | 'system.broadcast_push'
  | 'flag.update'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    adminId: string,
    action: AuditAction,
    targetUserId?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { adminId, action, targetUserId, details: details as Prisma.InputJsonValue | undefined },
    })
  }

  async list(opts: { adminId?: string; action?: string; targetUserId?: string; limit: number; offset: number }) {
    const where = {
      ...(opts.adminId ? { adminId: opts.adminId } : {}),
      ...(opts.action ? { action: { contains: opts.action } } : {}),
      ...(opts.targetUserId ? { targetUserId: opts.targetUserId } : {}),
    }
    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        skip: opts.offset,
        include: { targetUser: { select: { email: true } } },
      }),
    ])
    return { total, logs }
  }
}
