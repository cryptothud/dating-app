import { Module } from '@nestjs/common'
import { ModerationModule } from '../moderation/moderation.module'
import { PhotosController } from './photos.controller'
import { PhotosService } from './photos.service'

@Module({
  imports: [ModerationModule],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
