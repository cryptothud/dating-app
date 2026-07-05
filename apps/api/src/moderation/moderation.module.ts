import { Module } from '@nestjs/common'
import { CloudinaryService } from './cloudinary.service'
import { ModerationService } from './moderation.service'

@Module({
  providers: [CloudinaryService, ModerationService],
  exports: [CloudinaryService, ModerationService],
})
export class ModerationModule {}
