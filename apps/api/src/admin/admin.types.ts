import type { FeatureFlag, Prisma } from '@prisma/client'

/**
 * Response shapes for the admin API.
 *
 * The Prisma selects live here as consts so the query and its type come from one
 * declaration: change a select and the response type follows, rather than drifting from a
 * hand-written interface.
 */

/**
 * Page wrappers. Each list endpoint reports the unpaginated total alongside its rows, and
 * names the row collection after its resource, so these stay separate rather than collapsing
 * into one generic with a shared key.
 */
export interface UserSearchPage {
  total: number
  users: AdminUserSummary[]
}

export interface BannedUserPage {
  total: number
  users: BannedUser[]
}

export interface TimedOutUserPage {
  total: number
  users: TimedOutUser[]
}

export interface ReportPage {
  total: number
  reports: AdminReport[]
}

export interface TicketPage {
  total: number
  tickets: AdminTicket[]
}

export interface AuditLogPage {
  total: number
  logs: AuditLogEntry[]
}

// ── Dashboard ───────────────────────────────────────────────────────

export interface DashboardStats {
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

export interface SystemStatus {
  maintenanceMode: boolean
  flags: FeatureFlag[]
}

// ── Users ───────────────────────────────────────────────────────────

export const adminUserSummarySelect = {
  id: true,
  email: true,
  phone: true,
  verified: true,
  suspended: true,
  banned: true,
  role: true,
  createdAt: true,
  lastActive: true,
  timeoutUntil: true,
  profile: { select: { displayName: true } },
  subscription: { select: { tier: true, expiresAt: true } },
  _count: { select: { reportsReceived: true } },
} satisfies Prisma.UserSelect

export type AdminUserSummary = Prisma.UserGetPayload<{ select: typeof adminUserSummarySelect }>

export const bannedUserSelect = {
  id: true,
  email: true,
  verified: true,
  banned: true,
  suspended: true,
  role: true,
  createdAt: true,
  timeoutUntil: true,
  banReason: true,
  profile: { select: { displayName: true } },
} satisfies Prisma.UserSelect

export type BannedUser = Prisma.UserGetPayload<{ select: typeof bannedUserSelect }>

export const timedOutUserSelect = {
  id: true,
  email: true,
  verified: true,
  banned: true,
  suspended: true,
  role: true,
  createdAt: true,
  timeoutUntil: true,
  profile: { select: { displayName: true } },
} satisfies Prisma.UserSelect

export type TimedOutUser = Prisma.UserGetPayload<{ select: typeof timedOutUserSelect }>

export const elevatedUserSelect = {
  id: true,
  email: true,
  role: true,
  profile: { select: { displayName: true } },
} satisfies Prisma.UserSelect

export type ElevatedUser = Prisma.UserGetPayload<{ select: typeof elevatedUserSelect }>

export const adminUserDetailInclude = {
  profile: true,
  subscription: true,
  reportsReceived: { orderBy: { createdAt: 'desc' }, take: 10 },
  reportsGiven: { orderBy: { createdAt: 'desc' }, take: 5 },
  auditLogsTargeted: { orderBy: { createdAt: 'desc' }, take: 20 },
} satisfies Prisma.UserInclude

export type AdminUserDetail = Prisma.UserGetPayload<{ include: typeof adminUserDetailInclude }>

// ── Moderation ──────────────────────────────────────────────────────

export const adminReportInclude = {
  reporter: {
    select: { id: true, email: true, profile: { select: { displayName: true } } },
  },
  reported: {
    select: {
      id: true,
      email: true,
      profile: { select: { displayName: true } },
      suspended: true,
      banned: true,
    },
  },
} satisfies Prisma.ReportInclude

export type AdminReport = Prisma.ReportGetPayload<{ include: typeof adminReportInclude }>

// ── Support ─────────────────────────────────────────────────────────

export const adminTicketInclude = {
  user: {
    select: {
      id: true,
      suspended: true,
      banned: true,
      _count: { select: { reportsReceived: true } },
    },
  },
  _count: { select: { replies: true } },
} satisfies Prisma.SupportTicketInclude

export type AdminTicket = Prisma.SupportTicketGetPayload<{ include: typeof adminTicketInclude }>

export const adminTicketDetailInclude = {
  user: {
    select: {
      id: true,
      email: true,
      suspended: true,
      banned: true,
      profile: { select: { displayName: true } },
    },
  },
  replies: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.SupportTicketInclude

export type AdminTicketDetail = Prisma.SupportTicketGetPayload<{
  include: typeof adminTicketDetailInclude
}>

// ── Audit ───────────────────────────────────────────────────────────

export const auditLogInclude = {
  targetUser: { select: { email: true } },
} satisfies Prisma.AuditLogInclude

export type AuditLogEntry = Prisma.AuditLogGetPayload<{ include: typeof auditLogInclude }>
