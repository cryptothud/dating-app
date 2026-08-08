import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary } from 'cloudinary'
import type { UploadApiResponse } from 'cloudinary'

export interface CloudinaryResult {
  publicId: string
  secureUrl: string
  moderationStatus: 'approved' | 'rejected' | 'pending'
  isNsfw: boolean
  nsfwScore: number
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name)
  private configured = false

  constructor(private readonly config: ConfigService) {}

  private ensureConfigured(): void {
    if (this.configured) return
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME')
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY')
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET')
    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Cloudinary credentials not set — uploads disabled')
      return
    }
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
    this.configured = true
  }

  async upload(
    buffer: Buffer,
    folder: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<CloudinaryResult> {
    this.ensureConfigured()

    if (!this.configured) {
      // Dev fallback — return a placeholder so uploads don't hard-fail without credentials
      const mockId = `${folder}/mock_${Date.now()}`
      this.logger.warn(
        `[MOCK UPLOAD] Cloudinary not configured — returning placeholder for ${mockId}`,
      )
      return {
        publicId: mockId,
        secureUrl:
          resourceType === 'video'
            ? `https://example.com/mock-audio-${Date.now()}.webm`
            : `https://placehold.co/800x800/1a1a2e/ffffff?text=Photo`,
        moderationStatus: 'approved',
        isNsfw: false,
        nsfwScore: 0,
      }
    }

    const mimePrefix = resourceType === 'video' ? 'video/webm' : 'image/jpeg'
    const dataUri = `data:${mimePrefix};base64,${buffer.toString('base64')}`

    const result = await new Promise<UploadApiResponse>((resolve, reject): void => {
      // The callback settles this promise; the one upload() returns is redundant, and
      // leaving it unhandled would surface as an unhandled rejection on failure.
      void cloudinary.uploader.upload(
        dataUri,
        { folder, resource_type: resourceType },
        (err, res): void => {
          // Cloudinary's error is a plain response object, not an Error.
          if (err || !res) reject(new Error(err?.message ?? 'Upload failed'))
          else resolve(res)
        },
      )
    })

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      moderationStatus: 'approved',
      isNsfw: false,
      nsfwScore: 0,
    }
  }

  async destroy(publicId: string): Promise<void> {
    this.ensureConfigured()
    await cloudinary.uploader.destroy(publicId)
  }
}
