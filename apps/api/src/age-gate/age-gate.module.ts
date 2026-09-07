import { Module } from '@nestjs/common'
import { AgeGateController } from './age-gate.controller'
import { AgeGateService } from './age-gate.service'

@Module({
  controllers: [AgeGateController],
  providers: [AgeGateService],
})
export class AgeGateModule {}
