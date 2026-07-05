import { Module } from '@nestjs/common'
import { LocationController } from './location.controller'
import { LocationService } from './location.service'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [PrismaModule, RedisModule, BillingModule],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
