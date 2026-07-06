import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { User, Profile, Photo, ProfilePrompt } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { UpsertPromptDto } from './dto/upsert-prompt.dto'

type FullProfile = Profile & { photos: Photo[]; prompts: ProfilePrompt[]; interests: string[] }

type PhotoItem = {
  id: string; url: string; thumbUrl: string; isPrimary: boolean
  blurEnabled: boolean; isNsfw: boolean; nsfwScore: number | null
  moderationStatus: string; order: number
}
type PromptItem = { id: string; promptKey: string; answer: string; order: number }

// Full profile returned to the profile owner
export interface ProfileResponse {
  id: string
  userId: string
  displayName: string | null
  bio: string | null
  age: number | null
  bodyType: string | null
  sexuality: string | null
  interests: string[]
  lookingFor: string[]
  nsfwEnabled: boolean
  activelyLooking: boolean
  photos: PhotoItem[]
  prompts: PromptItem[]
  verified: boolean
  trustScore: number
}

// Subset returned to other users — omits private fields
export interface PublicProfileResponse {
  id: string
  userId: string
  displayName: string | null
  bio: string | null
  age: number | null
  bodyType: string | null
  sexuality: string | null
  interests: string[]
  lookingFor: string[]
  activelyLooking: boolean
  photos: PhotoItem[]
  prompts: PromptItem[]
  verified: boolean
}

const PROFILE_VIEWS_TTL = 60 * 60 * 24 * 30 // 30 days
const PROFILE_VIEWS_MAX = 200

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPublicProfile(targetUserId: string, requestingUserId: string): Promise<PublicProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } })
    if (!user) throw new NotFoundException('Profile not found')

    // Respect incognito mode
    if (user.incognito) throw new NotFoundException('Profile not found')

    // Enforce block in both directions
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: requestingUserId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: requestingUserId },
        ],
      },
    })
    if (block) throw new NotFoundException('Profile not found')

    const [profile, viewer] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId: targetUserId },
        include: {
          photos: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
          prompts: { orderBy: { order: 'asc' } },
        },
      }),
      this.prisma.profile.findUnique({
        where: { userId: requestingUserId },
        select: { nsfwEnabled: true },
      }),
    ])
    if (!profile) throw new NotFoundException('Profile not found')
    const viewerNsfwEnabled = viewer?.nsfwEnabled ?? false

    // Record view (non-blocking, skip self-views)
    if (requestingUserId !== targetUserId) {
      const key = `profile_views:${targetUserId}`
      void this.redis.zadd(key, Date.now(), requestingUserId).then(() =>
        this.redis.zremrangebyrank(key, 0, -(PROFILE_VIEWS_MAX + 1)),
      )
    }

    return this.toPublicResponse(user, profile, viewerNsfwEnabled)
  }

  async getMyProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
        prompts: { orderBy: { order: 'asc' } },
      },
    })
    const profile = existing ?? await this.prisma.profile.create({
      data: { userId },
      include: { photos: true, prompts: true },
    })
    return this.toResponse(user, profile)
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    // DOB-derived age takes precedence; dto.age is a one-time fallback for legacy accounts
    const age = user.dateOfBirth ? this.ageFromDob(user.dateOfBirth) : (dto.age ?? undefined)
    const { age: _age, ...rest } = dto
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...rest, age },
      update: { ...rest, age },
      include: {
        photos: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
        prompts: { orderBy: { order: 'asc' } },
      },
    })
    return this.toResponse(user, profile)
  }

  private ageFromDob(dob: Date): number {
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    return age
  }

  async upsertPrompt(
    userId: string,
    dto: UpsertPromptDto,
  ): Promise<{ id: string; promptKey: string; answer: string; order: number }> {
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
    const existing = await this.prisma.profilePrompt.findFirst({
      where: { profileId: profile.id, promptKey: dto.promptKey },
    })
    if (existing) {
      return this.prisma.profilePrompt.update({
        where: { id: existing.id },
        data: { answer: dto.answer, order: dto.order ?? existing.order },
      })
    }
    const count = await this.prisma.profilePrompt.count({ where: { profileId: profile.id } })
    if (count >= 3) throw new BadRequestException('Maximum 3 prompts allowed')
    return this.prisma.profilePrompt.create({
      data: { profileId: profile.id, promptKey: dto.promptKey, answer: dto.answer, order: dto.order ?? count },
    })
  }

  async recordProfileView(viewedUserId: string, viewerUserId: string): Promise<void> {
    if (viewedUserId === viewerUserId) return
    const viewer = await this.prisma.user.findUnique({ where: { id: viewerUserId }, select: { incognito: true } })
    if (!viewer || viewer.incognito) return
    const key = `profile_views:${viewedUserId}`
    const now = Date.now()
    await this.redis.zadd(key, now, viewerUserId)
    await this.redis.zremrangebyscore(key, 0, now - 30 * 24 * 3600 * 1000)
    await this.redis.expire(key, 30 * 24 * 3600)
  }

  async getProfileViewers(userId: string): Promise<{ id: string; displayName: string | null; photoUrl: string | null; viewedAt: string }[]> {
    const key = `profile_views:${userId}`
    const all = await this.redis.zrevrangeWithScores(key, 0, 99)
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000
    const raw = all.filter((r) => r.score >= cutoff)
    if (raw.length === 0) return []

    const viewerIds = raw.map((r) => r.member)
    const users = await this.prisma.user.findMany({
      where: { id: { in: viewerIds } },
      select: {
        id: true,
        profile: {
          select: {
            displayName: true,
            photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
      },
    })

    const userMap = new Map(users.map((u) => [u.id, u]))

    return raw
      .map((r) => {
        const u = userMap.get(r.member)
        if (!u) return null
        return {
          id: u.id,
          displayName: u.profile?.displayName ?? null,
          photoUrl: u.profile?.photos[0]?.url ?? null,
          viewedAt: new Date(r.score).toISOString(),
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
  }

  async deletePrompt(userId: string, promptId: string): Promise<void> {
    const prompt = await this.prisma.profilePrompt.findUnique({
      where: { id: promptId },
      include: { profile: true },
    })
    if (!prompt || prompt.profile.userId !== userId) throw new ForbiddenException()
    await this.prisma.profilePrompt.delete({ where: { id: promptId } })
  }

  private toResponse(user: User, profile: FullProfile): ProfileResponse {
    const age = profile.age ?? (user.dateOfBirth ? this.ageFromDob(user.dateOfBirth) : null)
    return {
      id: profile.id,
      userId: user.id,
      displayName: profile.displayName,
      bio: profile.bio,
      age,
      bodyType: profile.bodyType ?? null,
      sexuality: profile.sexuality ?? null,
      interests: profile.interests ?? [],
      lookingFor: profile.lookingFor,
      nsfwEnabled: profile.nsfwEnabled,
      activelyLooking: profile.activelyLooking,
      photos: profile.photos.map((p) => ({
        id: p.id, url: p.url, thumbUrl: p.thumbUrl, isPrimary: p.isPrimary,
        blurEnabled: p.blurEnabled, isNsfw: p.isNsfw, nsfwScore: p.nsfwScore,
        moderationStatus: p.moderationStatus, order: p.order,
      })),
      prompts: profile.prompts.map((p) => ({
        id: p.id, promptKey: p.promptKey, answer: p.answer, order: p.order,
      })),
      verified: user.verified,
      trustScore: user.trustScore,
    }
  }

  private blurCloudinaryUrl(url: string): string {
    if (!url.includes('res.cloudinary.com')) return url
    return url.replace('/image/upload/', '/image/upload/e_blur:800/')
  }

  private toPublicResponse(user: User, profile: FullProfile, viewerNsfwEnabled: boolean): PublicProfileResponse {
    return {
      id: profile.id,
      userId: user.id,
      displayName: profile.displayName,
      bio: profile.bio,
      age: profile.age,
      bodyType: profile.bodyType ?? null,
      sexuality: profile.sexuality ?? null,
      interests: profile.interests ?? [],
      lookingFor: profile.lookingFor,
      activelyLooking: profile.activelyLooking,
      photos: profile.photos.map((p) => {
        const shouldBlur = p.isNsfw && !viewerNsfwEnabled
        return {
          id: p.id,
          url: shouldBlur ? this.blurCloudinaryUrl(p.url) : p.url,
          thumbUrl: shouldBlur ? this.blurCloudinaryUrl(p.thumbUrl) : p.thumbUrl,
          isPrimary: p.isPrimary,
          blurEnabled: shouldBlur,
          isNsfw: p.isNsfw,
          nsfwScore: p.nsfwScore,
          moderationStatus: p.moderationStatus,
          order: p.order,
        }
      }),
      prompts: profile.prompts.map((p) => ({
        id: p.id, promptKey: p.promptKey, answer: p.answer, order: p.order,
      })),
      verified: user.verified,
    }
  }
}
