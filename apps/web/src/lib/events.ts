import { api } from './api'
import type { EventSummary, MapViewportQuery } from '@dating-app/types'

export interface CreateEventPayload {
  title: string
  description?: string
  latitude: number
  longitude: number
  displayArea?: string
  scheduledAt: string
  maxAttendees?: number
}

export const eventsApi = {
  getMapEvents: (viewport: MapViewportQuery): Promise<EventSummary[]> => {
    const params = new URLSearchParams({
      swLat: String(viewport.swLat),
      swLng: String(viewport.swLng),
      neLat: String(viewport.neLat),
      neLng: String(viewport.neLng),
    })
    return api.get<EventSummary[]>(`/events/map?${params.toString()}`)
  },

  getEvent: (id: string): Promise<EventSummary & { isCreator: boolean }> =>
    api.get(`/events/${id}`),

  create: (payload: CreateEventPayload): Promise<EventSummary> =>
    api.post('/events', payload),

  rsvp: (id: string): Promise<{ conversationId: string }> =>
    api.post(`/events/${id}/rsvp`, {}),

  cancelRsvp: (id: string): Promise<void> =>
    api.del(`/events/${id}/rsvp`),

  deleteEvent: (id: string): Promise<void> =>
    api.del(`/events/${id}`),
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
