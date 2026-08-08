import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ModeratorGuard } from '../admin/moderator.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ChatService } from './chat.service'
import { GlobalChatService } from './global-chat.service'
import type {
  ConversationDetail,
  ConversationSummary,
  EditedMessage,
  GlobalChatHistory,
  MessageDto,
} from '@dating-app/types'
import { ChatGateway } from './chat.gateway'
import { AdminService } from '../admin/admin.service'
import { CreateDmDto } from './dto/create-dm.dto'
import { EditMessageDto, TimeoutDto } from '../admin/dto/admin-action.dto'
import type { AuthUser } from '../common/decorators/current-user.decorator'

const AUDIO_MIME = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'video/webm'])
const AUDIO_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const IMAGE_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

@Controller('chat')
export class ChatController {
  constructor(
    private chat: ChatService,
    private globalChat: GlobalChatService,
    private gateway: ChatGateway,
    private adminService: AdminService,
  ) {}

  @Get('global')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  getGlobalMessages(@Query('before') before?: string): Promise<GlobalChatHistory> {
    const cursor = before !== undefined ? parseInt(before, 10) : undefined
    return this.globalChat.getHistory(cursor)
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  getConversations(@CurrentUser() user: AuthUser): Promise<ConversationSummary[]> {
    return this.chat.getConversations(user.id)
  }

  @Get('conversations/archived')
  @UseGuards(JwtAuthGuard)
  getArchivedConversations(@CurrentUser() user: AuthUser): Promise<ConversationSummary[]> {
    return this.chat.getArchivedConversations(user.id)
  }

  @Post('conversations/:id/revive')
  @UseGuards(JwtAuthGuard)
  reviveConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ): Promise<{ revived: boolean }> {
    return this.chat.reviveConversation(user.id, conversationId)
  }

  @Post('conversations/dm')
  @UseGuards(JwtAuthGuard)
  startDm(@CurrentUser() user: AuthUser, @Body() dto: CreateDmDto): Promise<{ id: string }> {
    return this.chat.findOrCreateDm(user.id, dto.otherUserId)
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  getConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ): Promise<ConversationDetail> {
    return this.chat.getConversation(user.id, conversationId)
  }

  @Get('conversations/:id/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
  ): Promise<MessageDto[]> {
    return this.chat.getMessages(user.id, conversationId, cursor)
  }

  @Post('conversations/:id/voice-note')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: AUDIO_MAX_BYTES } }))
  async uploadVoiceNote(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<MessageDto> {
    if (!file) throw new BadRequestException('No audio file provided')
    if (!AUDIO_MIME.has(file.mimetype)) throw new BadRequestException('Unsupported audio format')

    const msg = await this.chat.createVoiceMessage(user.id, conversationId, file.buffer)
    this.gateway.broadcastToRoom(conversationId, 'new_message', msg)
    await this.notifyDmRecipients(user.id, conversationId, '🎤 Voice note')
    return msg
  }

  @Post('conversations/:id/image')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: IMAGE_MAX_BYTES } }))
  async uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('body') body?: string,
  ): Promise<MessageDto> {
    if (!file) throw new BadRequestException('No image provided')
    if (!IMAGE_MIME.has(file.mimetype))
      throw new BadRequestException('Only JPEG, PNG, WebP, and GIF are accepted')
    const msg = await this.chat.uploadImageMessage(
      user.id,
      conversationId,
      file.buffer,
      file.mimetype,
      body,
    )
    this.gateway.broadcastToRoom(conversationId, 'new_message', msg)
    const preview = body?.trim() ? `📷 ${body.trim().slice(0, 80)}` : '📷 Image'
    await this.notifyDmRecipients(user.id, conversationId, preview)
    return msg
  }

  private async notifyDmRecipients(
    senderId: string,
    conversationId: string,
    preview: string,
  ): Promise<void> {
    const [recipients, sender] = await Promise.all([
      this.chat.getOtherParticipantIds(senderId, conversationId),
      this.chat.getSenderProfile(senderId),
    ])
    for (const recipientId of recipients) {
      this.gateway.emitToUser(recipientId, 'new_dm', {
        conversationId,
        senderId,
        senderName: sender.displayName,
        senderAvatar: sender.avatarUrl,
        body: preview,
      })
    }
  }

  // ── Conversation management (per-user) ───────────────────────────

  @Post('conversations/:id/archive')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ): Promise<void> {
    return this.chat.archiveConversation(user.id, conversationId)
  }

  @Delete('conversations/:id/archive')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unarchiveConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ): Promise<void> {
    return this.chat.unarchiveConversation(user.id, conversationId)
  }

  @Delete('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  hideConversation(
    @CurrentUser() user: AuthUser,
    @Param('id') conversationId: string,
  ): Promise<void> {
    return this.chat.hideConversation(user.id, conversationId)
  }

  // ── Pinned messages ───────────────────────────────────────────────

  @Get('conversations/:id/pinned')
  @UseGuards(JwtAuthGuard)
  getPinnedConvMessage(
    @Param('id') conversationId: string,
  ): Promise<{ messageId: string; body: string; senderName: string; pinnedUntil: string } | null> {
    return this.chat.getPinnedMessage(conversationId)
  }

  @Post('mod/conversations/:id/pin/:messageId')
  @UseGuards(ModeratorGuard)
  async pinConvMessage(
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Body('durationMinutes') durationMinutes: number,
  ): Promise<{ messageId: string; body: string; senderName: string; pinnedUntil: string }> {
    const pinned = await this.chat.pinMessage(conversationId, messageId, durationMinutes)
    this.gateway.broadcastToRoom(conversationId, 'conversation_pinned', {
      conversationId,
      ...pinned,
    })
    return pinned
  }

  @Get('global/pinned')
  async getPinnedGlobalMessage(): Promise<{
    messageId: string
    body: string
    senderName: string
    pinnedUntil: string
  } | null> {
    return this.globalChat.getPinnedGlobalMessage()
  }

  @Delete('mod/global/pin')
  @UseGuards(ModeratorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpinGlobalMessage(): Promise<void> {
    await this.globalChat.unpinGlobalMessage()
    this.gateway.broadcastToRoom('global', 'global_unpinned', {})
  }

  @Delete('mod/global/:messageId')
  @UseGuards(ModeratorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGlobalMessage(@Param('messageId') messageId: string): Promise<void> {
    await this.globalChat.deleteGlobalMessage(messageId)
    this.gateway.broadcastToRoom('global', 'global_message_deleted', { messageId })
  }

  @Post('mod/global/pin/:messageId')
  @UseGuards(ModeratorGuard)
  async pinGlobalMessage(
    @Param('messageId') messageId: string,
    @Body('durationMinutes') durationMinutes: number,
    @Body('body') body: string,
    @Body('senderName') senderName: string,
  ): Promise<{ messageId: string; body: string; senderName: string; pinnedUntil: string }> {
    const pinned = await this.globalChat.pinGlobalMessage(
      messageId,
      body,
      senderName,
      durationMinutes,
    )
    this.gateway.broadcastToRoom('global', 'global_pinned', pinned)
    return pinned
  }

  // ── Moderation (admin / moderator only) ──────────────────────────

  // ── Moderator user actions (accessible by mods from chat UI) ─────

  @Post('mod/users/:userId/timeout')
  @UseGuards(ModeratorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async timeoutFromChat(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: TimeoutDto,
  ): Promise<void> {
    await this.adminService.timeoutUser(user.id, userId, dto.durationMinutes, dto.reason)
  }

  @Post('mod/users/:userId/ban')
  @UseGuards(ModeratorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async banFromChat(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body('reason') reason: string | undefined,
  ): Promise<void> {
    await this.adminService.banUser(user.id, userId, reason ?? 'Banned by moderator')
    await this.globalChat.deleteUserMessages(userId)
    this.gateway.broadcastToRoom('global', 'global_user_banned', { userId })
  }

  // ── Moderation (message-level) ────────────────────────────────────

  @Delete('messages/:id')
  @UseGuards(ModeratorGuard)
  async deleteMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') messageId: string,
  ): Promise<{ id: string; conversationId: string; deletedAt: string }> {
    const result = await this.chat.deleteMessage(user.id, messageId)
    this.gateway.broadcastToRoom(result.conversationId, 'message_deleted', {
      messageId: result.id,
      conversationId: result.conversationId,
      deletedAt: result.deletedAt,
    })
    return result
  }

  @Patch('messages/:id')
  @UseGuards(ModeratorGuard)
  async editMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') messageId: string,
    @Body() dto: EditMessageDto,
  ): Promise<EditedMessage> {
    const result = await this.chat.editMessage(user.id, messageId, dto.body)
    this.gateway.broadcastToRoom(result.conversationId, 'message_edited', {
      messageId: result.id,
      conversationId: result.conversationId,
      body: result.body,
      editedAt: result.editedAt,
    })
    return result
  }
}
