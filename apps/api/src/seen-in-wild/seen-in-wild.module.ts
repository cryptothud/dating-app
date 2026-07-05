import { Module } from '@nestjs/common'
import { SeenInWildService } from './seen-in-wild.service'
import { SeenInWildController } from './seen-in-wild.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [SeenInWildController],
  providers: [SeenInWildService],
})
export class SeenInWildModule {}
