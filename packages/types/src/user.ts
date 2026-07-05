export type UserRole = 'user' | 'moderator' | 'admin'

export interface Photo {
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

export interface ProfilePrompt {
  id: string
  promptKey: string
  answer: string
  order: number
}

export interface UserProfile {
  id: string
  userId: string
  displayName: string | null
  bio: string | null
  age: number | null
  bodyType: string | null
  interests: string[]
  lookingFor: string[]
  nsfwEnabled: boolean
  activelyLooking: boolean
  photos: Photo[]
  prompts: ProfilePrompt[]
  verified: boolean
  trustScore: number
}

export interface GlobalMessage {
  id: string
  userId: string
  displayName: string
  photoUrl: string | null
  body: string
  sentAt: string
  lat?: number
  lng?: number
}

export interface GlobalChatHistory {
  messages: GlobalMessage[]
  hasMore: boolean
}

export interface ConversationSummary {
  id: string
  otherUser: {
    id: string
    displayName: string | null
    photoUrl: string | null
    verified: boolean
    distanceMiles?: number | null
  }
  lastMessage: { body: string; sentAt: string; senderId: string } | null
  unreadCount: number
  archivedAt?: string | null
  isUserArchived?: boolean
}

export interface MessageDto {
  id: string
  conversationId: string
  senderId: string
  body: string | null
  mediaType: string
  mediaUrl: string | null
  sentAt: string
  readAt: string | null
  editedAt: string | null
  deletedAt: string | null
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export interface PublicUser {
  id: string
  email: string
  phone: string
  verified: boolean
  trustScore: number
  role: UserRole
  createdAt: string
  lastActive: string
}

export interface TrustScoreBreakdown {
  phoneVerified: boolean
  emailVerified: boolean
  photoAdded: boolean
  selfieVerified: boolean
  accountAge7Days: boolean
  accountAge30Days: boolean
  total: number
}

export const TRUST_SCORE_VALUES = {
  PHONE_VERIFIED: 20,
  EMAIL_VERIFIED: 10,
  PHOTO_ADDED: 10,
  SELFIE_VERIFIED: 30,
  ACCOUNT_AGE_7_DAYS: 10,
  ACCOUNT_AGE_30_DAYS: 10,
} as const

export const TRUST_THRESHOLDS = {
  MAP_BROWSE: 0,
  RECEIVE_REQUESTS: 20,
  SEND_5_PER_DAY: 30,
  SEND_20_PER_DAY: 50,
  FULL_MESSAGING: 70,
  TRUSTED: 80,
} as const
