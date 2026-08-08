import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type {
  ConversationDetail,
  ConversationSummary,
  EditedMessage,
  MessageDto,
} from '@dating-app/types'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { EmailService } from '../email/email.service'
import { ConfigService } from '@nestjs/config'
import { PremiumService } from '../billing/premium.service'
import { CloudinaryService } from '../moderation/cloudinary.service'
import { ModerationService } from '../moderation/moderation.service'

const MSG_WAITING_TTL = 86400 // 24 hr dedup
const msgWaitingKey = (recipientId: string): string => `email:msg_waiting:${recipientId}`
const ARCHIVE_AFTER_MS = 30 * 24 * 60 * 60 * 1000

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private emailSvc: EmailService,
    private premium: PremiumService,
    private cloudinary: CloudinaryService,
    private moderation: ModerationService,
    private config: ConfigService,
  ) {}

  onModuleInit(): void {
    void this.archiveStaleConversations()
    setInterval((): undefined => void this.archiveStaleConversations(), 24 * 60 * 60 * 1000)
  }

  private haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (d: number): number => (d * Math.PI) / 180
    const R = 3958.8
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const [convs, rawUnread, myLoc] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          type: 'direct',
          archivedAt: null,
          participants: { some: { userId, archivedAt: null, hiddenAt: null } },
        },
        include: {
          participants: {
            include: {
              user: {
                include: {
                  profile: {
                    include: { photos: { orderBy: { isPrimary: 'desc' as const }, take: 1 } },
                  },
                  location: true,
                },
              },
            },
          },
          messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.$queryRaw<Array<{ conversation_id: string; count: bigint }>>`
        SELECT m.conversation_id, COUNT(*) AS count
        FROM messages m
        JOIN conversation_participants cp
          ON cp.conversation_id = m.conversation_id AND cp.user_id = ${userId}
        WHERE m.sender_id != ${userId}
          AND m.deleted_at IS NULL
          AND (cp.last_read_at IS NULL OR m.sent_at > cp.last_read_at)
        GROUP BY m.conversation_id
      `,
      this.prisma.userLocation.findUnique({ where: { userId } }),
    ])

    const unreadMap = new Map(rawUnread.map((r): [string, number] => [r.conversation_id, Number(r.count)]))

    return convs
      .map((conv) => {
        const mine = conv.participants.find((p): boolean => p.userId === userId)
        const other = conv.participants.find((p): boolean => p.userId !== userId)
        if (!mine || !other) return null

        const last = conv.messages[0] ?? null
        const otherLoc = other.user.location
        const distanceMiles =
          myLoc && otherLoc
            ? Math.round(
                this.haversineMi(
                  myLoc.latitude,
                  myLoc.longitude,
                  otherLoc.latitude,
                  otherLoc.longitude,
                ) * 10,
              ) / 10
            : null

        return {
          id: conv.id,
          otherUser: {
            id: other.user.id,
            displayName: other.user.profile?.displayName ?? null,
            photoUrl: other.user.profile?.photos[0]?.url ?? null,
            verified: other.user.verified,
            distanceMiles,
          },
          lastMessage: last
            ? { body: last.body ?? '', sentAt: last.sentAt.toISOString(), senderId: last.senderId }
            : null,
          unreadCount: unreadMap.get(conv.id) ?? 0,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b): number => {
        const aT = a.lastMessage?.sentAt ?? ''
        const bT = b.lastMessage?.sentAt ?? ''
        return bT.localeCompare(aT)
      })
  }

  async findOrCreateDm(userId: string, otherUserId: string): Promise<{ id: string; }> {
    if (userId === otherUserId) throw new ForbiddenException('Cannot DM yourself')

    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    })
    if (block) throw new ForbiddenException('Cannot message this user')

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'direct',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
    })

    if (existing) {
      // If the user previously deleted this conversation, unhide it and set clearedAt so old messages stay hidden
      await this.prisma.conversationParticipant.updateMany({
        where: { conversationId: existing.id, userId, hiddenAt: { not: null } },
        data: { hiddenAt: null, clearedAt: new Date() },
      })
      return { id: existing.id }
    }

    const created = await this.prisma.conversation.create({
      data: {
        type: 'direct',
        participants: { create: [{ userId }, { userId: otherUserId }] },
      },
    })

    return { id: created.id }
  }

  async checkUserCanSend(userId: string): Promise<{ allowed: boolean; errorMessage?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { banned: true, banReason: true, suspended: true, timeoutUntil: true },
    })
    if (!user) return { allowed: false, errorMessage: 'User not found' }
    if (user.banned) {
      return {
        allowed: false,
        errorMessage: `Your account has been permanently banned.${user.banReason ? ` Reason: ${user.banReason}` : ''}`,
      }
    }
    if (user.suspended) {
      return { allowed: false, errorMessage: 'Your account is currently suspended.' }
    }
    if (user.timeoutUntil && user.timeoutUntil > new Date()) {
      const until = user.timeoutUntil.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      return {
        allowed: false,
        errorMessage: `You are in timeout until ${until}. You cannot send messages during this time.`,
      }
    }
    return { allowed: true }
  }

  async getMessages(userId: string, conversationId: string, cursor?: string): Promise<MessageDto[]> {
    await this.assertParticipant(userId, conversationId)

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { clearedAt: true },
    })

    const msgs = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(participant?.clearedAt ? { sentAt: { gt: participant.clearedAt } } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    return msgs.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      body: m.deletedAt ? null : m.body,
      mediaType: m.mediaType,
      mediaUrl: m.deletedAt ? null : (m.mediaUrl ?? null),
      sentAt: m.sentAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
      editedAt: m.editedAt?.toISOString() ?? null,
      deletedAt: m.deletedAt?.toISOString() ?? null,
    }))
  }

  async createMessage(
    userId: string,
    conversationId: string,
    body: string,
    mediaType?: string,
  ): Promise<MessageDto> {
    await this.assertParticipant(userId, conversationId)

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true, archivedAt: true },
    })

    if (conv?.archivedAt) {
      const { isPremiumPlus } = await this.premium.getStatus(userId)
      if (!isPremiumPlus) {
        throw new ForbiddenException(
          'This conversation is archived. Upgrade to Premium+ to revive it.',
        )
      }
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { archivedAt: null },
      })
    }

    // Group/event chat and voice notes are premium-only
    if (conv && (conv.type === 'group' || conv.type === 'event')) {
      await this.premium.requirePremium(userId)
    }
    if (mediaType === 'voice') {
      await this.premium.requirePremium(userId)
    }

    // When someone sends a message, unhide the conversation for recipients who deleted it
    // and set clearedAt so they only see messages from this point forward (clean slate)
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: userId }, hiddenAt: { not: null } },
      data: { hiddenAt: null, clearedAt: new Date() },
    })

    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body,
        ...(mediaType ? { mediaType: mediaType as never } : {}),
      },
    })

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      body: msg.body,
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl ?? null,
      sentAt: msg.sentAt.toISOString(),
      readAt: msg.readAt?.toISOString() ?? null,
      editedAt: null,
      deletedAt: null,
    }
  }

  async deleteMessage(moderatorId: string, messageId: string): Promise<{ id: string; conversationId: string; deletedAt: string; }> {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) throw new NotFoundException('Message not found')
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy: moderatorId },
    })
    return {
      id: updated.id,
      conversationId: updated.conversationId,
      deletedAt: updated.deletedAt!.toISOString(),
    }
  }

  async editMessage(moderatorId: string, messageId: string, newBody: string): Promise<EditedMessage> {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) throw new NotFoundException('Message not found')
    if (msg.deletedAt) throw new BadRequestException('Cannot edit a deleted message')
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { body: newBody, editedAt: new Date() },
    })
    return {
      id: updated.id,
      conversationId: updated.conversationId,
      body: updated.body,
      editedAt: updated.editedAt!.toISOString(),
      moderatorId,
    }
  }

  async markRead(userId: string, conversationId: string): Promise<Date> {
    const now = new Date()
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    })
    return now
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationDetail> {
    await this.assertParticipant(userId, conversationId)
    const [conv, myLoc] = await Promise.all([
      this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            where: { userId: { not: userId } },
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      displayName: true,
                      photos: {
                        orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
                        take: 1,
                        select: { url: true },
                      },
                    },
                  },
                  location: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.userLocation.findUnique({ where: { userId } }),
    ])
    if (!conv) throw new NotFoundException('Conversation not found')
    const other = conv.participants[0]
    if (!other) throw new NotFoundException('Conversation not found')
    const otherLoc = other.user.location
    const distanceMiles =
      myLoc && otherLoc
        ? Math.round(
            this.haversineMi(
              myLoc.latitude,
              myLoc.longitude,
              otherLoc.latitude,
              otherLoc.longitude,
            ) * 10,
          ) / 10
        : null
    return {
      id: conv.id,
      type: conv.type,
      otherUser: {
        id: other.user.id,
        displayName: other.user.profile?.displayName ?? null,
        photoUrl: other.user.profile?.photos[0]?.url ?? null,
        verified: other.user.verified,
        lastActiveAt: other.user.lastActive.toISOString(),
        distanceMiles,
      },
    }
  }

  async createVoiceMessage(
    userId: string,
    conversationId: string,
    buffer: Buffer,
  ): Promise<MessageDto> {
    await this.assertParticipant(userId, conversationId)
    await this.premium.requirePremium(userId)

    const cdn = await this.cloudinary.upload(buffer, `voice/${userId}`, 'video')

    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: null,
        mediaType: 'voice',
        mediaUrl: cdn.secureUrl,
      },
    })

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      body: msg.body,
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl ?? null,
      sentAt: msg.sentAt.toISOString(),
      readAt: null,
      editedAt: null,
      deletedAt: null,
    }
  }

  async uploadImageMessage(
    userId: string,
    conversationId: string,
    buffer: Buffer,
    mimetype: string,
    body?: string,
  ): Promise<MessageDto> {
    await this.assertParticipant(userId, conversationId)

    const otherMsg = await this.prisma.message.findFirst({
      where: { conversationId, senderId: { not: userId }, deletedAt: null },
    })
    if (!otherMsg) {
      throw new ForbiddenException('Images can only be sent after the other person has replied')
    }

    const [photoDna, azure] = await Promise.all([
      this.moderation.checkPhotoDna(buffer),
      this.moderation.checkAzure(buffer),
    ])

    if (photoDna?.isMatch || azure?.csamSuspected) {
      await this.moderation.handleCsamDetection(userId, '', '')
      throw new ForbiddenException('Upload rejected')
    }

    if ((azure?.violenceSeverity ?? 0) >= 4) {
      throw new ForbiddenException('Image flagged for violent content')
    }

    const cdn = await this.cloudinary.upload(buffer, `dm/${conversationId}`, 'image')

    const isNsfw = cdn.isNsfw || (azure?.sexualSeverity ?? 0) >= 4
    const allowNsfw = this.config.get<boolean>('ALLOW_NSFW_CONTENT')
    if (isNsfw && !allowNsfw) {
      await this.cloudinary.destroy(cdn.publicId)
      throw new ForbiddenException('Adult content is not permitted on this platform')
    }

    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: body?.trim() || null,
        mediaType: 'photo',
        mediaUrl: cdn.secureUrl,
      },
    })

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      body: msg.body,
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl ?? null,
      sentAt: msg.sentAt.toISOString(),
      readAt: null,
      editedAt: null,
      deletedAt: null,
    }
  }

  async notifyMessagesWaiting(senderId: string, conversationId: string): Promise<void> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
      include: {
        user: { select: { id: true, email: true } },
      },
    })

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { profile: { select: { displayName: true } } },
    })
    const senderName = sender?.profile?.displayName ?? 'Someone'

    for (const p of participants) {
      const recipientId = p.userId
      const dedupKey = msgWaitingKey(recipientId)
      const already = await this.redis.get(dedupKey)
      if (already) continue

      await this.redis.set(dedupKey, '1', MSG_WAITING_TTL)
      void this.emailSvc.sendMessagesWaiting(p.user.email, senderName, conversationId)
    }
  }

  async checkRecipientBanned(senderId: string, conversationId: string): Promise<boolean> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
      select: { user: { select: { banned: true } } },
    })
    return participants.some((p): boolean => p.user.banned)
  }

  async getOtherParticipantIds(senderId: string, conversationId: string): Promise<string[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
      select: { userId: true },
    })
    return participants.map((p): string => p.userId)
  }

  async getDisplayName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { displayName: true } } },
    })
    return user?.profile?.displayName ?? 'Someone'
  }

  async getSenderProfile(
    userId: string,
  ): Promise<{ displayName: string; avatarUrl: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: {
          select: {
            displayName: true,
            photos: { where: { isPrimary: true }, take: 1, select: { thumbUrl: true } },
          },
        },
      },
    })
    return {
      displayName: user?.profile?.displayName ?? 'Someone',
      avatarUrl: user?.profile?.photos[0]?.thumbUrl ?? null,
    }
  }

  async pinMessage(conversationId: string, messageId: string, durationMinutes: number): Promise<{ messageId: string; body: string; senderName: string; pinnedUntil: string; }> {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) throw new NotFoundException('Message not found')
    if (msg.conversationId !== conversationId)
      throw new BadRequestException('Message not in this conversation')
    if (msg.deletedAt) throw new BadRequestException('Cannot pin a deleted message')

    const senderName = await this.getDisplayName(msg.senderId)
    const pinnedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    const pinned = { messageId, body: msg.body ?? '', senderName, pinnedUntil }
    await this.redis.set(
      `pinned:conv:${conversationId}`,
      JSON.stringify(pinned),
      durationMinutes * 60,
    )
    return pinned
  }

  async getPinnedMessage(conversationId: string): Promise<{ messageId: string; body: string; senderName: string; pinnedUntil: string; } | null> {
    const raw = await this.redis.get(`pinned:conv:${conversationId}`)
    if (!raw) return null
    const pinned = JSON.parse(raw) as {
      messageId: string
      body: string
      senderName: string
      pinnedUntil: string
    }
    if (new Date(pinned.pinnedUntil) <= new Date()) return null
    return pinned
  }

  async archiveStaleConversations(): Promise<void> {
    const cutoff = new Date(Date.now() - ARCHIVE_AFTER_MS)
    const stale = await this.prisma.conversation.findMany({
      where: {
        type: 'direct',
        archivedAt: null,
        createdAt: { lt: cutoff },
        messages: { none: { sentAt: { gte: cutoff } } },
      },
      include: {
        participants: {
          include: { user: { include: { subscription: true } } },
        },
      },
    })

    const toArchive = stale.filter((conv): boolean =>
      conv.participants.every((p): boolean => {
        const sub = p.user.subscription
        return !sub || sub.expiresAt <= new Date() || sub.tier !== 'premium_plus'
      }),
    )

    if (toArchive.length === 0) return
    await this.prisma.conversation.updateMany({
      where: { id: { in: toArchive.map((c): string => c.id) } },
      data: { archivedAt: new Date() },
    })
  }

  async getArchivedConversations(userId: string): Promise<ConversationSummary[]> {
    const include = {
      participants: {
        include: {
          user: {
            include: {
              profile: {
                include: { photos: { orderBy: { isPrimary: 'desc' as const }, take: 1 } },
              },
            },
          },
        },
      },
      messages: { orderBy: { sentAt: 'desc' as const }, take: 1 },
    }

     
    const whereParticipant = (
      extra: Prisma.ConversationParticipantWhereInput,
    ): Prisma.ConversationParticipantListRelationFilter => ({
      some: { userId, ...extra },
    })

    const [systemArchived, userArchived] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          type: 'direct',
          archivedAt: { not: null },
          participants: whereParticipant({ hiddenAt: null }),
        },
        include,
      }),
      this.prisma.conversation.findMany({
        where: {
          type: 'direct',
          archivedAt: null,
          participants: whereParticipant({ archivedAt: { not: null }, hiddenAt: null }),
        },
        include,
      }),
    ])

    const mapConv = (
      conv: (typeof systemArchived)[0],
      archivedAt: string,
      isUserArchived: boolean,
    ) => {
      const mine = conv.participants.find((p): boolean => p.userId === userId)
      const other = conv.participants.find((p): boolean => p.userId !== userId)
      if (!mine || !other) return null
      const last = conv.messages[0] ?? null
      return {
        id: conv.id,
        otherUser: {
          id: other.user.id,
          displayName: other.user.profile?.displayName ?? null,
          photoUrl: other.user.profile?.photos[0]?.url ?? null,
          verified: other.user.verified,
        },
        lastMessage: last
          ? { body: last.body ?? '', sentAt: last.sentAt.toISOString(), senderId: last.senderId }
          : null,
        unreadCount: 0,
        archivedAt,
        isUserArchived,
      }
    }

    return [
      ...systemArchived.map((c) => mapConv(c, c.archivedAt!.toISOString(), false)),
      ...userArchived.map((c) => {
        const mine = c.participants.find((p): boolean => p.userId === userId)
        if (!mine?.archivedAt) return null
        return mapConv(c, mine.archivedAt.toISOString(), true)
      }),
    ]
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b): number => b.archivedAt.localeCompare(a.archivedAt))
  }

  async archiveConversation(userId: string, conversationId: string): Promise<void> {
    await this.assertParticipant(userId, conversationId)
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { archivedAt: new Date() },
    })
  }

  async unarchiveConversation(userId: string, conversationId: string): Promise<void> {
    await this.assertParticipant(userId, conversationId)
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { archivedAt: null },
    })
  }

  async hideConversation(userId: string, conversationId: string): Promise<void> {
    await this.assertParticipant(userId, conversationId)
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { hiddenAt: new Date() },
    })
  }

  async reviveConversation(userId: string, conversationId: string): Promise<{ revived: boolean }> {
    await this.assertParticipant(userId, conversationId)
    await this.premium.requirePremiumPlus(userId)

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { archivedAt: true },
    })
    if (!conv) throw new NotFoundException('Conversation not found')
    if (!conv.archivedAt) return { revived: false }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { archivedAt: null },
    })
    return { revived: true }
  }

  async assertParticipant(userId: string, conversationId: string): Promise<void> {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })
    if (!p) throw new NotFoundException('Conversation not found')
  }
}
