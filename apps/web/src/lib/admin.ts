import { api } from './api'

export interface AdminStats {
  totalUsers: number
  newUsersToday: number
  monthlySignups: number
  onlineNow: number
  activeSubscriptions: number
  messagesTotal: number
  openReports: number
  openTickets: number
  maintenanceMode: boolean
}

export interface AdminUser {
  id: string
  email: string
  phone: string | null
  verified: boolean
  suspended: boolean
  banned: boolean
  banReason: string | null
  role: string
  createdAt: string
  lastActive: string
  timeoutUntil: string | null
  profile: { displayName: string | null } | null
  subscription: { tier: string; expiresAt: string } | null
  _count: { reportsReceived: number }
}

export interface AdminReport {
  id: string
  reason: string
  details: string | null
  status: string
  createdAt: string
  reporter: { id: string; email: string; profile: { displayName: string | null } | null }
  reported: { id: string; email: string; profile: { displayName: string | null } | null; suspended: boolean; banned: boolean }
}

export interface SupportTicket {
  id: string
  email: string
  subject: string
  body: string
  status: string
  adminNotes: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; suspended: boolean; banned: boolean; _count: { reportsReceived: number } } | null
  _count: { replies: number }
}

export interface TicketReply {
  id: string
  adminId: string
  body: string
  createdAt: string
}

export interface AuditEntry {
  id: string
  adminId: string
  action: string
  targetUserId: string | null
  details: Record<string, unknown> | null
  createdAt: string
  targetUser: { email: string } | null
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string | null
}

export const adminApi = {
  // Public (work during maintenance)
  getStatus: () => api.get<{ maintenance: boolean }>('/admin/status'),
  adminLogin: (email: string, password: string) =>
    api.post<{ message: string }>('/admin/auth/login', { email, password }),

  // Dashboard
  getStats: () => api.get<AdminStats>('/admin/stats'),

  // Users
  searchUsers: (q: string, limit = 20, offset = 0) =>
    api.get<{ total: number; users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
  getUser: (id: string) => api.get<AdminUser & { reportsReceived: AdminReport[]; auditLogsTargeted: AuditEntry[] }>(`/admin/users/${id}`),
  warn: (id: string, reason: string) => api.post(`/admin/users/${id}/warn`, { reason }),
  suspend: (id: string, reason: string) => api.post(`/admin/users/${id}/suspend`, { reason }),
  unsuspend: (id: string) => api.post(`/admin/users/${id}/unsuspend`),
  ban: (id: string, reason: string) => api.post(`/admin/users/${id}/ban`, { reason }),
  unban: (id: string) => api.post(`/admin/users/${id}/unban`),
  verify: (id: string) => api.post(`/admin/users/${id}/verify`),
  forceLogout: (id: string) => api.post(`/admin/users/${id}/force-logout`),
  clearTimeout: (id: string) => api.del(`/admin/users/${id}/timeout`),
  setRole: (id: string, role: 'user' | 'moderator' | 'admin') =>
    api.post(`/admin/users/${id}/set-role`, { role }),
  getElevatedUsers: () =>
    api.get<{ id: string; email: string; role: string; profile: { displayName: string | null } | null }[]>('/admin/users/elevated'),

  // Reports
  getReports: (status = 'open', limit = 20, offset = 0) =>
    api.get<{ total: number; reports: AdminReport[] }>(`/admin/reports?status=${status}&limit=${limit}&offset=${offset}`),
  resolveReport: (id: string, reason: string) => api.post(`/admin/reports/${id}/resolve`, { reason }),

  // Support
  getTickets: (status = 'open', limit = 20, offset = 0) =>
    api.get<{ total: number; tickets: SupportTicket[] }>(`/admin/support?status=${status}&limit=${limit}&offset=${offset}`),
  getTicket: (id: string) =>
    api.get<SupportTicket & { replies: TicketReply[] }>(`/admin/support/${id}`),
  replyToTicket: (id: string, body: string) => api.post(`/admin/support/${id}/reply`, { body }),
  updateTicketStatus: (id: string, status: string) => api.patch(`/admin/support/${id}/status`, { status }),

  // System
  getSystem: () => api.get<{ maintenanceMode: boolean; flags: FeatureFlag[] }>('/admin/system'),
  setMaintenance: (enabled: boolean) => api.post('/admin/system/maintenance', { enabled }),
  flushCache: (pattern: string) => api.post('/admin/system/flush-cache', { pattern }),
  broadcastPush: (title: string, body: string, url?: string) => api.post('/admin/system/broadcast-push', { title, body, url }),
  updateFlag: (key: string, enabled: boolean) => api.patch(`/admin/flags/${key}`, { enabled }),

  // Audit
  getAuditLog: (params: { limit?: number; offset?: number; action?: string; targetUserId?: string }) => {
    const q = new URLSearchParams()
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    if (params.action) q.set('action', params.action)
    if (params.targetUserId) q.set('targetUserId', params.targetUserId)
    return api.get<{ total: number; logs: AuditEntry[] }>(`/admin/audit?${q.toString()}`)
  },
}
