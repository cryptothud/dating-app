import { api } from './api'

export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'UNDERAGE'
  | 'CSAM'
  | 'FAKE_PROFILE'
  | 'VIOLENCE'
  | 'OTHER'

export const users = {
  block: (userId: string) => api.post(`/users/${userId}/block`),
  unblock: (userId: string) => api.del(`/users/${userId}/block`),
  getBlocked: () => api.get<{ id: string; displayName: string | null }[]>('/users/blocked'),
  report: (userId: string, reason: ReportReason, details: string) =>
    api.post(`/users/${userId}/report`, { reason, details }),
}
