import { api } from './api'
import type { MapUser, MapViewportQuery, MapFilters } from '@dating-app/types'

export const locationApi = {
  update: (latitude: number, longitude: number): Promise<void> =>
    api.patch<void>('/location', { latitude, longitude }),

  getMap: (viewport: MapViewportQuery, filters?: MapFilters): Promise<MapUser[]> => {
    const params = new URLSearchParams({
      swLat: String(viewport.swLat),
      swLng: String(viewport.swLng),
      neLat: String(viewport.neLat),
      neLng: String(viewport.neLng),
    })
    if (viewport.zoom !== undefined) params.set('zoom', String(Math.floor(viewport.zoom)))
    if (filters?.ageMin !== undefined) params.set('ageMin', String(filters.ageMin))
    if (filters?.ageMax !== undefined) params.set('ageMax', String(filters.ageMax))
    if (filters?.activelyOnly) params.set('activelyOnly', 'true')
    if (filters?.bodyType) params.set('bodyType', filters.bodyType)
    if (filters?.lookingFor?.length) {
      filters.lookingFor.forEach((v) => params.append('lookingFor', v))
    }
    if (filters?.interests?.length) {
      filters.interests.forEach((v) => params.append('interests', v))
    }
    return api.get<MapUser[]>(`/location/map?${params.toString()}`)
  },

  getClusters: (
    viewport: MapViewportQuery,
  ): Promise<Array<{ lat: number; lng: number; count: number }>> => {
    const params = new URLSearchParams({
      swLat: String(viewport.swLat),
      swLng: String(viewport.swLng),
      neLat: String(viewport.neLat),
      neLng: String(viewport.neLng),
    })
    if (viewport.zoom !== undefined) params.set('zoom', String(Math.floor(viewport.zoom)))
    return api.get<Array<{ lat: number; lng: number; count: number }>>(
      `/location/map/clusters?${params.toString()}`,
    )
  },

  getMyLocation: (): Promise<{ lat: number; lng: number; fuzzRadius: number } | null> =>
    api.get<{ lat: number; lng: number; fuzzRadius: number } | null>('/location/me'),

  setActivelyLooking: (enabled: boolean): Promise<void> =>
    api.patch<void>('/location/actively-looking', { enabled }),

  getActivelyLooking: (): Promise<{ enabled: boolean; expiresAt: string | null }> =>
    api.get<{ enabled: boolean; expiresAt: string | null }>('/location/actively-looking'),
}
