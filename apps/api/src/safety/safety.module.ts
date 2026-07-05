import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { TwilioModule } from '../twilio/twilio.module'
import { EmailModule } from '../email/email.module'
import { SafetyService } from './safety.service'
import { SafetyController, TrackController } from './safety.controller'

@Module({
  imports: [PrismaModule, TwilioModule, EmailModule],
  controllers: [SafetyController, TrackController],
  providers: [SafetyService],
})
export class SafetyModule {}
