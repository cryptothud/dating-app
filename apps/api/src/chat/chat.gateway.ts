import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { OnModuleInit } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { ChatService } from './chat.service'
import { GlobalChatService } from './global-chat.service'
import { PushService } from '../push/push.service'
import { RedisService } from '../redis/redis.service'
import { WarnBusService } from '../warn-bus/warn-bus.service'
import type { Env } from '../config/configuration'

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env['NODE_ENV'] === 'production'
      ? (process.env['WEB_URL'] ?? 'https://crush.app')
      : 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server

  private globalRoomCount = 0

  constructor(
    private chat: ChatService,
    private globalChat: GlobalChatService,
    private push: PushService,
    private redis: RedisService,
    private warnBus: WarnBusService,
    private jwt: JwtService,
    private config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    this.warnBus.on('warn', (userId: string, reason: string) => {
      void (async () => {
        const sockets = await this.server.to(`user:${userId}`).fetchSockets()
        if (sockets.length > 0) {
          // User is connected — deliver immediately and clear pending key so handleConnection won't re-deliver
          for (const s of sockets) s.emit('user_warned', { reason })
          await this.redis.del(`pending:warn:${userId}`)
        }
        // User is offline — leave Redis key for handleConnection to deliver on next connect
      })()
    })
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client)
    if (!token) {
      client.data.userId = null // anonymous — read-only access
      return
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      })
      client.data.userId = payload.sub
      // Auto-join personal room so the layout can receive new_dm events
      // without the user needing to open the DM thread first
      await client.join(`user:${payload.sub}`)
      // Deliver any pending warn notification queued while user was offline
      const raw = await this.redis.get(`pending:warn:${payload.sub}`)
      if (raw) {
        const warn = JSON.parse(raw) as { reason: string }
        client.emit('user_warned', { reason: warn.reason })
        await this.redis.del(`pending:warn:${payload.sub}`)
      }
    } catch {
      client.data.userId = null // bad/expired token — treat as anonymous
    }
  }

  handleDisconnect(client: Socket): void {
    if (client.rooms.has('global')) {
      this.globalRoomCount = Math.max(0, this.globalRoomCount - 1)
      this.server.to('global').emit('global_user_count', this.globalRoomCount)
    }
  }

  private extractToken(client: Socket): string | null {
    // Prefer explicit auth token (production cross-domain: Vercel frontend → Railway socket)
    const authToken = (client.handshake.auth as Record<string, unknown>)?.token
    if (typeof authToken === 'string' && authToken) return authToken
    // Fall back to cookie (dev same-origin)
    const cookieHeader = client.handshake.headers.cookie ?? ''
    const match = /(?:^|;\s*)access_token=([^;]+)/.exec(cookieHeader)
    const value = match?.[1]
    return value !== undefined ? decodeURIComponent(value) : null
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ): Promise<void> {
    const userId = client.data.userId as string | null
    if (!userId) return
    try {
      await this.chat.assertParticipant(userId, conversationId)
      await client.join(conversationId)
      const readAt = await this.chat.markRead(userId, conversationId)
      this.server.to(conversationId).emit('messages_read', {
        conversationId,
        userId,
        readAt: readAt.toISOString(),
      })
    } catch {
      // user not in conversation — ignore
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ): Promise<void> {
    await client.leave(conversationId)
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; body: string },
  ): Promise<void> {
    const userId = client.data.userId as string | null
    if (!userId) return
    if (!payload.body?.trim()) return

    const status = await this.chat.checkUserCanSend(userId)
    if (!status.allowed) {
      client.emit('chat_error', status.errorMessage)
      return
    }

    const recipientBanned = await this.chat.checkRecipientBanned(userId, payload.conversationId)
    if (recipientBanned) {
      client.emit('chat_error', 'This user has been banned and can no longer receive messages.')
      return
    }

    try {
      const msg = await this.chat.createMessage(userId, payload.conversationId, payload.body.trim())
      this.server.to(payload.conversationId).emit('new_message', msg)
      const recipients = await this.chat.getOtherParticipantIds(userId, payload.conversationId)
      const sender = await this.chat.getSenderProfile(userId)
      for (const recipientId of recipients) {
        // Emit to personal room so the nav badge updates in real-time even when
        // the recipient hasn't opened the DM thread (and isn't in the conv room)
        this.server.to(`user:${recipientId}`).emit('new_dm', {
          conversationId: payload.conversationId,
          senderId: userId,
          senderName: sender.displayName,
          senderAvatar: sender.avatarUrl,
          body: payload.body.trim().slice(0, 100),
        })
        void this.push.sendToUser(recipientId, {
          title: `New message from ${sender.displayName}`,
          body: payload.body.trim().slice(0, 100),
          url: `/messages/${payload.conversationId}`,
        })
      }
      void this.chat.notifyMessagesWaiting(userId, payload.conversationId)
    } catch {
      // conversation not found or not a participant
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ): Promise<void> {
    const userId = client.data.userId as string | null
    if (!userId) return
    try {
      const readAt = await this.chat.markRead(userId, conversationId)
      this.server.to(conversationId).emit('messages_read', {
        conversationId,
        userId,
        readAt: readAt.toISOString(),
      })
    } catch {
      // ignore
    }
  }

  broadcastToRoom(room: string, event: string, data: unknown): void {
    this.server.to(room).emit(event, data)
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data)
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ): void {
    const userId = client.data.userId as string | null
    if (!userId || !payload.conversationId) return
    client.to(payload.conversationId).emit('typing', { userId, conversationId: payload.conversationId })
  }

  @SubscribeMessage('stopped_typing')
  handleStoppedTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ): void {
    const userId = client.data.userId as string | null
    if (!userId || !payload.conversationId) return
    client.to(payload.conversationId).emit('stopped_typing', { userId, conversationId: payload.conversationId })
  }

  @SubscribeMessage('check_warnings')
  async handleCheckWarnings(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = client.data.userId as string | null
    if (!userId) return
    const raw = await this.redis.get(`pending:warn:${userId}`)
    if (!raw) return
    const warn = JSON.parse(raw) as { reason: string }
    client.emit('user_warned', { reason: warn.reason })
    await this.redis.del(`pending:warn:${userId}`)
  }

  // ── Global chat ───────────────────────────────────────────────

  @SubscribeMessage('join_global')
  async handleJoinGlobal(@ConnectedSocket() client: Socket): Promise<void> {
    await client.join('global')
    this.globalRoomCount++
    this.server.to('global').emit('global_user_count', this.globalRoomCount)
  }

  @SubscribeMessage('leave_global')
  async handleLeaveGlobal(@ConnectedSocket() client: Socket): Promise<void> {
    if (client.rooms.has('global')) {
      await client.leave('global')
      this.globalRoomCount = Math.max(0, this.globalRoomCount - 1)
      this.server.to('global').emit('global_user_count', this.globalRoomCount)
    }
  }

  @SubscribeMessage('send_global_message')
  async handleSendGlobalMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: string,
  ): Promise<void> {
    const userId = client.data.userId as string | null
    if (!userId) {
      client.emit('chat_error', 'Session expired — please refresh the page to sign in again.')
      return
    }
    if (!body?.trim()) return

    const status = await this.chat.checkUserCanSend(userId)
    if (!status.allowed) {
      client.emit('chat_error', status.errorMessage)
      return
    }

    // Two-tier rate limit: 2 per 3 s (burst) and 20 per 60 s (sustained)
    // Wrapped in try/catch so Redis unavailability never silently drops messages.
    try {
      const [burst, sustained] = await Promise.all([
        this.redis.incr(`gchat:burst:${userId}`, 3),
        this.redis.incr(`gchat:min:${userId}`, 60),
      ])
      if (burst > 2) {
        client.emit('chat_error', 'Slow down — you\'re sending messages too quickly.')
        return
      }
      if (sustained > 20) {
        client.emit('chat_error', 'You\'ve sent too many messages. Try again in a minute.')
        return
      }
    } catch {
      // Redis unavailable — allow message through
    }

    try {
      const msg = await this.globalChat.addMessage(userId, body.trim())
      this.server.to('global').emit('global_message', msg)
    } catch {
      client.emit('chat_error', 'Failed to send message — please try again.')
    }
  }
}
