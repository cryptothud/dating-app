import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

const AZURE_API_VERSION = '2024-02-15-preview'

const LIKELIHOOD: Record<string, number> = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 0.05,
  UNLIKELY: 0.2,
  POSSIBLE: 0.5,
  LIKELY: 0.8,
  VERY_LIKELY: 0.95,
}

export interface AzureResult {
  sexualSeverity: number
  violenceSeverity: number
  flagged: boolean
  csamSuspected: boolean
}

export interface GoogleResult {
  adult: string
  violence: string
  racy: string
  adultScore: number
  flagged: boolean
}

interface AzureCategory {
  category: string
  severity: number
}
interface AzureResponse {
  categoriesAnalysis: AzureCategory[]
}
interface GoogleSafeSearch {
  adult: string
  violence: string
  racy: string
}
interface GoogleResponse {
  responses: Array<{ safeSearchAnnotation?: GoogleSafeSearch }>
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async checkAzure(imageBuffer: Buffer): Promise<AzureResult | null> {
    const endpoint = this.config.get<string>('AZURE_CONTENT_SAFETY_ENDPOINT')
    const key = this.config.get<string>('AZURE_CONTENT_SAFETY_KEY')
    if (!endpoint || !key) {
      this.logger.warn('Azure Content Safety not configured — CSAM scan skipped')
      return null
    }

    // Azure Content Safety base64 limit is 4 MB
    const AZURE_MAX_BYTES = 4 * 1024 * 1024
    if (imageBuffer.length > AZURE_MAX_BYTES) {
      this.logger.warn(
        `Azure scan skipped — image (${(imageBuffer.length / 1024 / 1024).toFixed(1)} MB) exceeds 4 MB base64 limit`,
      )
      return null
    }

    const base64 = imageBuffer.toString('base64')
    const apiUrl = `${endpoint.replace(/\/$/, '')}/contentsafety/image:analyze?api-version=${AZURE_API_VERSION}`
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': key },
      body: JSON.stringify({
        image: { content: base64 },
        categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.error(`Azure Content Safety HTTP ${res.status}: ${body}`)
      return null
    }

    const data = (await res.json()) as AzureResponse
    const find = (name: string) =>
      data.categoriesAnalysis.find((c) => c.category === name)?.severity ?? 0
    const sexualSeverity = find('Sexual')
    const violenceSeverity = find('Violence')

    return {
      sexualSeverity,
      violenceSeverity,
      flagged: sexualSeverity >= 4 || violenceSeverity >= 4,
      csamSuspected: sexualSeverity >= 6,
    }
  }

  async checkGoogleVision(imageUrl: string): Promise<GoogleResult | null> {
    const apiKey = this.config.get<string>('GOOGLE_VISION_API_KEY')
    if (!apiKey) {
      this.logger.warn('Google Vision not configured — safe-search scan skipped')
      return null
    }

    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: imageUrl } },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }],
          },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.error(`Google Vision HTTP ${res.status}: ${body}`)
      return null
    }

    const data = (await res.json()) as GoogleResponse
    const ss = data.responses[0]?.safeSearchAnnotation
    if (!ss) return null

    const adultScore = LIKELIHOOD[ss.adult] ?? 0
    const violenceScore = LIKELIHOOD[ss.violence] ?? 0

    return {
      adult: ss.adult,
      violence: ss.violence,
      racy: ss.racy,
      adultScore,
      flagged: adultScore >= 0.8 || violenceScore >= 0.8,
    }
  }

  async checkPhotoDna(imageBuffer: Buffer): Promise<{ isMatch: boolean } | null> {
    const apiKey = this.config.get<string>('PHOTODNA_API_KEY')
    if (!apiKey) return null

    try {
      const res = await fetch('https://api.microsoftphotodna.com/v1.0/Match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        body: imageBuffer,
      })

      if (!res.ok) {
        this.logger.error(`PhotoDNA HTTP ${res.status}: ${await res.text().catch(() => '')}`)
        return null
      }

      const data = (await res.json()) as { IsMatch: boolean }
      return { isMatch: data.IsMatch }
    } catch (err) {
      this.logger.error(
        `PhotoDNA request failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  async handleCsamDetection(userId: string, publicId: string, secureUrl: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { suspended: true } })

    this.logger.error(
      `[CSAM-DETECTED] userId=${userId} publicId=${publicId} url=${secureUrl} — account suspended`,
    )
    this.logger.error(
      '[CSAM-ACTION-REQUIRED] File NCMEC CyberTipline report at https://report.cybertip.org within 24 hours.',
    )
  }
}
