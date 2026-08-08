import { api } from './api'
import type { ConversationSummary, GlobalChatHistory, MessageDto } from '@dating-app/types'

export interface PinnedMessage {
  messageId: string
  body: string
  senderName: string
  pinnedUntil: string
}

export interface ConversationDetail {
  id: string
  type: string
  otherUser: {
    id: string
    displayName: string | null
    photoUrl: string | null
    verified: boolean
    lastActiveAt?: string
    distanceMiles?: number | null
  }
}

export const chatApi = {
  getGlobalMessages: (before?: number) => {
    const qs = before !== undefined ? `?before=${before}` : ''
    return api.get<GlobalChatHistory>(`/chat/global${qs}`)
  },

  getConversations: () => api.get<ConversationSummary[]>('/chat/conversations'),

  getArchivedConversations: () => api.get<ConversationSummary[]>('/chat/conversations/archived'),

  reviveConversation: (conversationId: string) =>
    api.post<{ revived: boolean }>(`/chat/conversations/${conversationId}/revive`, {}),

  startDm: (otherUserId: string) =>
    api.post<{ id: string }>('/chat/conversations/dm', { otherUserId }),

  getConversation: (conversationId: string) =>
    api.get<ConversationDetail>(`/chat/conversations/${conversationId}`),

  getMessages: (conversationId: string, cursor?: string) => {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    return api.get<MessageDto[]>(`/chat/conversations/${conversationId}/messages${params}`)
  },

  uploadVoiceNote: (conversationId: string, blob: Blob) => {
    const form = new FormData()
    form.append('audio', blob, 'voice-note.webm')
    return api.upload<MessageDto>(`/chat/conversations/${conversationId}/voice-note`, form)
  },

  uploadImage: (conversationId: string, file: File, body?: string) => {
    const form = new FormData()
    form.append('image', file)
    if (body) form.append('body', body)
    return api.upload<MessageDto>(`/chat/conversations/${conversationId}/image`, form)
  },

  archiveConversation: (conversationId: string) =>
    api.post<void>(`/chat/conversations/${conversationId}/archive`, {}),

  unarchiveConversation: (conversationId: string) =>
    api.del<void>(`/chat/conversations/${conversationId}/archive`),

  hideConversation: (conversationId: string) =>
    api.del<void>(`/chat/conversations/${conversationId}`),

  getPinnedConvMessage: (conversationId: string) =>
    api.get<PinnedMessage | null>(`/chat/conversations/${conversationId}/pinned`),

  pinConvMessage: (conversationId: string, messageId: string, durationMinutes: number) =>
    api.post<PinnedMessage>(`/chat/mod/conversations/${conversationId}/pin/${messageId}`, {
      durationMinutes,
    }),

  getPinnedGlobalMessage: () => api.get<PinnedMessage | null>('/chat/global/pinned'),

  pinGlobalMessage: (
    messageId: string,
    body: string,
    senderName: string,
    durationMinutes: number,
  ) =>
    api.post<PinnedMessage>(`/chat/mod/global/pin/${messageId}`, {
      durationMinutes,
      body,
      senderName,
    }),

  deleteGlobalMessage: (messageId: string) => api.del<void>(`/chat/mod/global/${messageId}`),

  unpinGlobalMessage: () => api.del<void>('/chat/mod/global/pin'),

  timeoutUserFromChat: (userId: string, durationMinutes: number) =>
    api.post<void>(`/chat/mod/users/${userId}/timeout`, { durationMinutes }),

  banUserFromChat: (userId: string) =>
    api.post<void>(`/chat/mod/users/${userId}/ban`, { reason: 'Banned by moderator' }),
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatMessageDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}
