import { api } from './api'
import type { WildSighting } from '@dating-app/types'

export const seenInWildApi = {
  getSightings: (): Promise<WildSighting[]> =>
    api.get<WildSighting[]>('/seen-in-wild'),

  getUnreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>('/seen-in-wild/count'),

  markNotified: (ids: string[]): Promise<void> =>
    api.post('/seen-in-wild/mark-notified', { ids }),
}
