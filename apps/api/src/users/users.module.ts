import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { EmailModule } from '../email/email.module'
import { BillingModule } from '../billing/billing.module'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'

@Module({
  imports: [PrismaModule, RedisModule, EmailModule, BillingModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
