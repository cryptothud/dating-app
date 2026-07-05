import { Module } from '@nestjs/common'
import { ProfileController } from './profile.controller'
import { ProfileService } from './profile.service'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [PrismaModule, RedisModule, BillingModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
