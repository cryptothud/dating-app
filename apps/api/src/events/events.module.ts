import { Module } from '@nestjs/common'
import { EventsService } from './events.service'
import { EventsController } from './events.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
