import { api } from './api'

export interface SafetyDate {
  id: string
  trackToken: string
  checkinAt: string
  durationMinutes: number
  endedAt: string | null
  sosTriggered: boolean
  createdAt: string
}

export interface CreateSafetyDatePayload {
  trustedContactPhone?: string
  trustedContactEmail?: string
  durationMinutes: number
}

export interface TrackingInfo {
  name: string
  lat: number | null
  lng: number | null
  updatedAt: string | null
  checkinAt: string
  sosTriggered: boolean
  ended: boolean
}

export const safety = {
  create: (payload: CreateSafetyDatePayload) => api.post<SafetyDate>('/safety/dates', payload),

  getActive: () => api.get<SafetyDate | null>('/safety/dates/active'),

  checkin: (id: string) => api.post<SafetyDate>(`/safety/dates/${id}/checkin`),

  sos: (id: string) => api.post<SafetyDate>(`/safety/dates/${id}/sos`),

  end: (id: string) => api.del(`/safety/dates/${id}`),

  getTracking: (token: string) => api.get<TrackingInfo>(`/track/${token}`),
}
