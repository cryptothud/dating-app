import { Module } from '@nestjs/common'
import { WarnBusService } from './warn-bus.service'

@Module({
  providers: [WarnBusService],
  exports: [WarnBusService],
})
export class WarnBusModule {}
