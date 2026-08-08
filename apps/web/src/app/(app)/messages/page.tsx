'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { chatApi, formatMessageTime } from '@/lib/chat'
import { useSocket } from '@/hooks/use-socket'
import type { ConversationSummary, MessageDto } from '@dating-app/types'

const PINNED_KEY = 'crush_pinned_convs'

function getPinned(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
function savePinned(set: Set<string>): void {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify([...set]))
  } catch {}
}

function Avatar({
  displayName,
  photoUrl,
  size = 10,
}: {
  displayName: string | null
  photoUrl: string | null
  size?: number
}): React.JSX.Element {
  const initials = (displayName ?? '?').slice(0, 2).toUpperCase()
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={displayName ?? 'User'}
        className={`w-${size} h-${size} shrink-0 rounded-full object-cover`}
      />
    )
  }
  return (
    <div
      className={`w-${size} h-${size} bg-primary/15 flex shrink-0 items-center justify-center rounded-full`}
    >
      <span className="text-primary text-xs font-semibold">{initials}</span>
    </div>
  )
}

function VerifiedIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      className="fill-primary -mt-px ml-0.5 inline-block h-3.5 w-3.5 shrink-0"
    >
      <path d="M8 1l1.48 3.01 3.32.48-2.4 2.34.57 3.3L8 8.57 5.03 10.13l.57-3.3-2.4-2.34 3.32-.48z" />
    </svg>
  )
}

type ConvAction = { type: 'pin' } | { type: 'archive'; label: string } | { type: 'delete' }

function ConvActionMenu({
  convId,
  isPinned,
  onPin,
  onArchive,
  onDelete,
  onClose,
}: {
  convId: string
  isPinned: boolean
  onPin: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (confirmDelete) {
    return (
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border-destructive/30 absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2 rounded-xl border px-3 py-2 shadow-lg"
      >
        <span className="text-foreground text-xs font-medium">Delete conversation?</span>
        <button
          onClick={() => {
            onDelete(convId)
            onClose()
          }}
          className="text-destructive text-xs font-semibold hover:underline"
        >
          Yes
        </button>
        <span className="text-muted-foreground text-xs">·</span>
        <button
          onClick={() => setConfirmDelete(false)}
          className="text-muted-foreground hover:text-foreground text-xs font-semibold"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="bg-background border-border absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1 rounded-xl border px-2 py-1.5 shadow-lg"
    >
      <button
        onClick={() => {
          onPin(convId)
          onClose()
        }}
        title={isPinned ? 'Unpin' : 'Pin'}
        className={[
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
          isPinned
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <path d="M16 3a1 1 0 0 1 .707.293l4 4a1 1 0 0 1-1.032 1.649L17 8.236V14a1 1 0 0 1-.553.894l-4 2a1 1 0 0 1-1.341-.447L10 14.618l-3.553 3.553a1 1 0 0 1-1.414-1.414l3.553-3.553-1.829-1.106a1 1 0 0 1-.447-1.341l2-4A1 1 0 0 1 9 6h5.764l.67-2.684A1 1 0 0 1 16 3z" />
        </svg>
        {isPinned ? 'Unpin' : 'Pin'}
      </button>
      <div className="bg-border mx-0.5 h-5 w-px" />
      <button
        onClick={() => {
          onArchive(convId)
          onClose()
        }}
        title="Archive"
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 8v13H3V8" />
          <path d="M1 3h22v5H1z" />
          <path d="M10 12h4" />
        </svg>
        Archive
      </button>
      <div className="bg-border mx-0.5 h-5 w-px" />
      <button
        onClick={() => setConfirmDelete(true)}
        title="Delete"
        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
        Delete
      </button>
    </div>
  )
}

export default function MessagesPage(): React.JSX.Element {
  const router = useRouter()
  const socket = useSocket()
  const [convs, setConvs] = useState<ConversationSummary[]>([])
  const [archived, setArchived] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)

  useEffect(() => {
    setPinned(getPinned())
  }, [])

  const load = useCallback(async () => {
    try {
      const [active, archivedData] = await Promise.all([
        chatApi.getConversations(),
        chatApi.getArchivedConversations(),
      ])
      setConvs(active)
      setArchived(archivedData)
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Re-fetch when the tab becomes visible so profile changes (name/PFP) are picked up
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(() => void load(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [load])

  // Shadow ref so socket handlers can read current convs without stale closures
  const convsRef = useRef<ConversationSummary[]>([])
  useEffect(() => {
    convsRef.current = convs
  }, [convs])

  useEffect(() => {
    const onNewMessage = (msg: MessageDto) => {
      setConvs((prev) =>
        prev
          .map((c) =>
            c.id === msg.conversationId
              ? {
                  ...c,
                  lastMessage: { body: msg.body ?? '', sentAt: msg.sentAt, senderId: msg.senderId },
                  unreadCount: c.unreadCount + 1,
                }
              : c,
          )
          .sort((a, b) => (b.lastMessage?.sentAt ?? '').localeCompare(a.lastMessage?.sentAt ?? '')),
      )
    }

    const onNewDm = (payload: { conversationId: string; senderId: string; body?: string }) => {
      const exists = convsRef.current.some((c) => c.id === payload.conversationId)
      if (!exists) {
        // New conversation not yet in the list — reload to fetch it
        void load()
        return
      }
      setConvs((prev) =>
        prev
          .map((c) =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  lastMessage: {
                    body: payload.body ?? '',
                    sentAt: new Date().toISOString(),
                    senderId: payload.senderId,
                  },
                  unreadCount: c.unreadCount + 1,
                }
              : c,
          )
          .sort((a, b) => (b.lastMessage?.sentAt ?? '').localeCompare(a.lastMessage?.sentAt ?? '')),
      )
    }

    socket.on('new_message', onNewMessage)
    socket.on('new_dm', onNewDm)
    return () => {
      socket.off('new_message', onNewMessage)
      socket.off('new_dm', onNewDm)
    }
  }, [socket, load])

  const togglePin = (convId: string) => {
    setPinned((prev) => {
      const next = new Set(prev)
      if (next.has(convId)) next.delete(convId)
      else next.add(convId)
      savePinned(next)
      return next
    })
  }

  const handleArchive = async (convId: string) => {
    try {
      await chatApi.archiveConversation(convId)
      const conv = convs.find((c) => c.id === convId)
      setConvs((prev) => prev.filter((c) => c.id !== convId))
      if (conv) {
        setArchived((prev) => [
          { ...conv, archivedAt: new Date().toISOString(), isUserArchived: true },
          ...prev,
        ])
      }
    } catch {
      /* noop */
    }
  }

  const handleUnarchive = async (convId: string) => {
    try {
      await chatApi.unarchiveConversation(convId)
      const conv = archived.find((c) => c.id === convId)
      setArchived((prev) => prev.filter((c) => c.id !== convId))
      if (conv) {
        setConvs((prev) => [
          { ...conv, archivedAt: null, isUserArchived: false, unreadCount: 0 },
          ...prev,
        ])
      }
    } catch {
      /* noop */
    }
  }

  const handleDelete = async (convId: string) => {
    try {
      await chatApi.hideConversation(convId)
      setConvs((prev) => prev.filter((c) => c.id !== convId))
    } catch {
      /* noop */
    }
  }

  const filtered = convs.filter((c) => {
    if (!search.trim()) return true
    return (c.otherUser.displayName ?? '').toLowerCase().includes(search.toLowerCase().trim())
  })

  const sorted = [...filtered].sort((a, b) => {
    const ap = pinned.has(a.id) ? 1 : 0
    const bp = pinned.has(b.id) ? 1 : 0
    return bp - ap
  })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  if (convs.length === 0 && archived.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
          <svg
            viewBox="0 0 24 24"
            className="stroke-primary h-7 w-7 fill-none"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <p className="text-foreground text-sm font-semibold">No messages yet</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            When you connect with someone on the map, your conversation will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" onClick={() => setActiveMenu(null)}>
      <div className="shrink-0 px-4 pb-2 pt-4">
        <h1 className="font-display text-foreground mb-3 text-xl font-bold">Messages</h1>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-9 w-full rounded-xl border pl-9 pr-3 text-sm focus:outline-none focus:ring-1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {sorted.length === 0 && search && (
          <p className="text-muted-foreground py-8 text-center text-sm">No conversations found</p>
        )}

        <div className="space-y-px">
          {sorted.map((conv) => {
            const isPinned = pinned.has(conv.id)
            const menuOpen = activeMenu === conv.id
            return (
              <div key={conv.id} className="group relative">
                <button
                  onClick={() => {
                    if (menuOpen) {
                      setActiveMenu(null)
                      return
                    }
                    router.push(`/messages/${conv.otherUser.id}`)
                  }}
                  className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors dark:hover:bg-white/5"
                >
                  <div className="relative shrink-0">
                    <Avatar
                      displayName={conv.otherUser.displayName}
                      photoUrl={conv.otherUser.photoUrl}
                      size={12}
                    />
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary border-background absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 px-0.5 text-[9px] font-bold leading-none text-white">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-0.5">
                        {isPinned && (
                          <svg viewBox="0 0 24 24" className="fill-primary mr-0.5 h-3 w-3 shrink-0">
                            <path d="M16 3a1 1 0 0 1 .707.293l4 4a1 1 0 0 1-1.032 1.649L17 8.236V14a1 1 0 0 1-.553.894l-4 2a1 1 0 0 1-1.341-.447L10 14.618l-3.553 3.553a1 1 0 0 1-1.414-1.414l3.553-3.553-1.829-1.106a1 1 0 0 1-.447-1.341l2-4A1 1 0 0 1 9 6h5.764l.67-2.684A1 1 0 0 1 16 3z" />
                          </svg>
                        )}
                        <span
                          className={[
                            'truncate text-sm',
                            conv.unreadCount > 0
                              ? 'text-foreground font-bold'
                              : 'text-foreground font-semibold',
                          ].join(' ')}
                        >
                          {conv.otherUser.displayName ?? 'User'}
                        </span>
                        {conv.otherUser.verified && <VerifiedIcon />}
                      </div>
                      {conv.lastMessage && (
                        <span
                          className={[
                            'shrink-0 text-[11px]',
                            conv.unreadCount > 0
                              ? 'text-foreground font-medium'
                              : 'text-muted-foreground',
                          ].join(' ')}
                        >
                          {formatMessageTime(conv.lastMessage.sentAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p
                        className={[
                          'min-w-0 flex-1 truncate text-xs',
                          conv.unreadCount > 0
                            ? 'text-foreground/80 font-medium'
                            : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {conv.lastMessage?.body ?? 'Start a conversation'}
                      </p>
                      {conv.otherUser.distanceMiles != null && (
                        <span className="text-muted-foreground/60 shrink-0 text-[10px]">
                          {conv.otherUser.distanceMiles < 0.5
                            ? '< 1 mi'
                            : `${conv.otherUser.distanceMiles} mi`}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 3-dot menu trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenu(menuOpen ? null : conv.id)
                    }}
                    className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                      menuOpen ? 'bg-muted' : 'hover:bg-muted',
                    ].join(' ')}
                    aria-label="Conversation options"
                  >
                    <svg viewBox="0 0 24 24" className="fill-muted-foreground h-4 w-4">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      key="menu"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                    >
                      <ConvActionMenu
                        convId={conv.id}
                        isPinned={isPinned}
                        onPin={togglePin}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onClose={() => setActiveMenu(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* Archive section toggle */}
        {archived.length > 0 && !search && (
          <div className="mt-4">
            <button
              onClick={() => setShowArchive((v) => !v)}
              className="group flex w-full items-center justify-between px-1 py-2 text-left"
            >
              <div className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="stroke-muted-foreground h-4 w-4 fill-none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8v13H3V8" />
                  <path d="M1 3h22v5H1z" />
                  <path d="M10 12h4" />
                </svg>
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Archived · {archived.length}
                </span>
              </div>
              <svg
                viewBox="0 0 24 24"
                className={[
                  'stroke-muted-foreground h-4 w-4 fill-none transition-transform',
                  showArchive ? 'rotate-180' : '',
                ].join(' ')}
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <AnimatePresence>
              {showArchive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-px pt-1">
                    {archived.map((conv) => (
                      <div key={conv.id} className="flex items-center gap-3 rounded-2xl px-3 py-3">
                        <div className="relative shrink-0">
                          <Avatar
                            displayName={conv.otherUser.displayName}
                            photoUrl={conv.otherUser.photoUrl}
                            size={11}
                          />
                          <div className="bg-muted border-border absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border">
                            <svg
                              viewBox="0 0 24 24"
                              className="stroke-muted-foreground h-2.5 w-2.5 fill-none"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <path d="M21 8v13H3V8" />
                              <path d="M1 3h22v5H1z" />
                            </svg>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-0.5">
                            <span className="text-foreground/70 truncate text-sm font-semibold">
                              {conv.otherUser.displayName ?? 'User'}
                            </span>
                            {conv.otherUser.verified && <VerifiedIcon />}
                          </div>
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {conv.isUserArchived ? 'Archived by you' : 'Inactive · 30 days'}
                          </p>
                        </div>
                        {conv.isUserArchived ? (
                          <button
                            onClick={() => void handleUnarchive(conv.id)}
                            className="bg-muted text-foreground/70 hover:bg-primary/10 hover:text-primary h-7 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors"
                          >
                            Unarchive
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push('/upgrade')}
                            className="bg-primary/10 text-primary hover:bg-primary/20 h-7 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors"
                          >
                            Revive
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
