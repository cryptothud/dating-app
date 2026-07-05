import { Module } from '@nestjs/common'
import { BillingService } from './billing.service'
import { PremiumService } from './premium.service'
import { BillingController } from './billing.controller'
import { WebhookController } from './webhook.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [PrismaModule, RedisModule, EmailModule],
  controllers: [BillingController, WebhookController],
  providers: [BillingService, PremiumService],
  exports: [BillingService, PremiumService],
})
export class BillingModule {}
