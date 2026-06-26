export type UserRole = 'user' | 'admin'

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
