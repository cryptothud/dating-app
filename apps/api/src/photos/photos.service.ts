import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CloudinaryService } from '../moderation/cloudinary.service'
import { ModerationService } from '../moderation/moderation.service'
import { PrismaService } from '../prisma/prisma.service'
import type { Env } from '../config/configuration'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import type { UpdatePhotoDto } from './dto/update-photo.dto'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024

export interface PhotoResponse {
  id: string
  url: string
  thumbUrl: string
  isPrimary: boolean
  blurEnabled: boolean
  isNsfw: boolean
  nsfwScore: number | null
  moderationStatus: string
  order: number
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name)

  constructor(
    private readonly cdn: CloudinaryService,
    private readonly moderation: ModerationService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Only JPEG, PNG, and WebP are accepted')
    if (file.size > MAX_BYTES) throw new BadRequestException('File must be under 10 MB')
  }

  async upload(user: AuthUser, file: Express.Multer.File): Promise<PhotoResponse> {
    this.validateFile(file)

    const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) throw new ForbiddenException('Create a profile before uploading photos')

    // PhotoDNA hash check before upload — if PHOTODNA_API_KEY is set
    const photoDna = await this.moderation.checkPhotoDna(file.buffer)
    if (photoDna?.isMatch) {
      await this.moderation.handleCsamDetection(user.id, '', '')
      throw new ForbiddenException('Upload rejected')
    }

    const cdn = await this.cdn.upload(file.buffer, `users/${user.id}`)

    if (cdn.moderationStatus === 'rejected') {
      await this.cdn.destroy(cdn.publicId)
      throw new ForbiddenException('Image rejected by content moderation')
    }

    const [azure, google] = await Promise.all([
      this.moderation.checkAzure(file.buffer),
      this.moderation.checkGoogleVision(cdn.secureUrl),
    ])

    this.logger.log(
      `Moderation: azure=${azure ? `sexual=${azure.sexualSeverity} violence=${azure.violenceSeverity} flagged=${azure.flagged} csam=${azure.csamSuspected}` : 'skipped'} | google=${google ? `adult=${google.adult}(${google.adultScore.toFixed(2)}) flagged=${google.flagged}` : 'skipped'}`,
    )

    if (azure?.csamSuspected) {
      await this.cdn.destroy(cdn.publicId)
      await this.moderation.handleCsamDetection(user.id, cdn.publicId, cdn.secureUrl)
      throw new ForbiddenException('Upload rejected')
    }

    // Violence is never allowed regardless of NSFW setting
    const violenceFlagged = (azure?.violenceSeverity ?? 0) >= 4 || (google?.flagged && (google.violence === 'LIKELY' || google.violence === 'VERY_LIKELY'))
    if (violenceFlagged) {
      await this.cdn.destroy(cdn.publicId)
      throw new ForbiddenException('Image flagged for violent content')
    }

    const allowNsfw = this.config.get('ALLOW_NSFW_CONTENT')
    const isNsfw = cdn.isNsfw || (azure?.sexualSeverity ?? 0) >= 4 || (google?.adultScore ?? 0) > 0.7
    if (isNsfw && !allowNsfw) {
      await this.cdn.destroy(cdn.publicId)
      throw new ForbiddenException('Adult content is not permitted on this platform')
    }
    const existingCount = await this.prisma.photo.count({ where: { profileId: profile.id } })
    const photo = await this.prisma.photo.create({
      data: {
        profileId: profile.id,
        url: cdn.secureUrl,
        thumbUrl: cdn.secureUrl,
        cloudinaryPublicId: cdn.publicId,
        isPrimary: existingCount === 0,
        isNsfw,
        nsfwScore: cdn.nsfwScore,
        csamScanned: azure !== null,
        csamFlagged: false,
        azureFlagged: azure?.flagged ?? false,
        azureSexualSev: azure?.sexualSeverity ?? 0,
        googleAdultScore: google?.adult ?? null,
        moderationStatus: 'approved',
      },
    })

    return {
      id: photo.id,
      url: photo.url,
      thumbUrl: photo.thumbUrl,
      isPrimary: photo.isPrimary,
      blurEnabled: photo.blurEnabled,
      isNsfw: photo.isNsfw,
      nsfwScore: photo.nsfwScore,
      moderationStatus: photo.moderationStatus,
      order: photo.order,
    }
  }

  async remove(user: AuthUser, photoId: string): Promise<void> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId }, include: { profile: true } })
    if (!photo || photo.profile.userId !== user.id) throw new ForbiddenException()
    if (photo.cloudinaryPublicId) await this.cdn.destroy(photo.cloudinaryPublicId)
    await this.prisma.photo.delete({ where: { id: photoId } })
  }

  async update(user: AuthUser, photoId: string, dto: UpdatePhotoDto): Promise<void> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId }, include: { profile: true } })
    if (!photo || photo.profile.userId !== user.id) throw new ForbiddenException()
    if (dto.isPrimary) {
      await this.prisma.photo.updateMany({ where: { profileId: photo.profileId }, data: { isPrimary: false } })
    }
    await this.prisma.photo.update({
      where: { id: photoId },
      data: {
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        ...(dto.blurEnabled !== undefined && { blurEnabled: dto.blurEnabled }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    })
  }
}
