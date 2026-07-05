import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { EmailModule } from '../email/email.module'
import { PushModule } from '../push/push.module'
import { BillingModule } from '../billing/billing.module'
import { ModerationModule } from '../moderation/moderation.module'
import { AdminModule } from '../admin/admin.module'
import { WarnBusModule } from '../warn-bus/warn-bus.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatGateway } from './chat.gateway'
import { GlobalChatService } from './global-chat.service'

@Module({
  imports: [PrismaModule, RedisModule, EmailModule, PushModule, BillingModule, ModerationModule, AdminModule, WarnBusModule, JwtModule.register({})],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, GlobalChatService],
})
export class ChatModule {}
