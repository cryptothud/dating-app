import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { PhotosService } from './photos.service'
import type { PhotoResponse } from './photos.service'
import { UpdatePhotoDto } from './dto/update-photo.dto'

@Controller('photos')
@UseGuards(JwtAuthGuard)
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PhotoResponse> {
    if (!file) throw new BadRequestException('No file provided')
    return this.photos.upload(user, file)
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') photoId: string,
    @Body() dto: UpdatePhotoDto,
  ): Promise<{ ok: true }> {
    await this.photos.update(user, photoId, dto)
    return { ok: true }
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') photoId: string): Promise<{ ok: true }> {
    await this.photos.remove(user, photoId)
    return { ok: true }
  }
}
