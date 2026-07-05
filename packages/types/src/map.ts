export type MapUserStatus = 'online' | 'away' | 'seeded'

export interface MapUser {
  id: string
  lat: number
  lng: number
  status: MapUserStatus
  lastActiveAt: string
  activelyLooking: boolean
  isVerified: boolean
  isSeeded: boolean
  isBoosted?: boolean
  profileHighlight?: boolean
  displayName?: string
  age?: number
  bodyType?: string
  interests?: string[]
  lookingFor?: string[]
  primaryPhotoUrl?: string
  distanceMeters?: number
}

export interface MapFilters {
  ageMin?: number
  ageMax?: number
  lookingFor?: string[]
  activelyOnly?: boolean
  bodyType?: string
  interests?: string[]
}

export interface EventSummary {
  id: string
  creatorId: string
  title: string
  description: string | null
  lat: number
  lng: number
  displayArea: string | null
  scheduledAt: string
  expiresAt: string
  maxAttendees: number | null
  rsvpCount: number
  hasRsvped: boolean
  conversationId: string | null
}

export interface WildSighting {
  id: string
  occurredAt: string
  otherUser: {
    id: string
    displayName: string | null
    photoUrl: string | null
    blurred: boolean
  }
}

export interface UpdateLocationDto {
  latitude: number
  longitude: number
}

export interface MapViewportQuery {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
  zoom?: number
}

export interface ActivelyLookingDto {
  enabled: boolean
}
