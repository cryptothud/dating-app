'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { chatApi, formatMessageTime } from '@/lib/chat'
import { useSocket } from '@/hooks/use-socket'
import type { ConversationSummary, MessageDto } from '@dating-app/types'

const PINNED_KEY = 'crush_pinned_convs'

function getPinned(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') as string[]) } catch { return new Set() }
}
function savePinned(set: Set<string>): void {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify([...set])) } catch {}
}

function Avatar({
  displayName, photoUrl, size = 10,
}: { displayName: string | null; photoUrl: string | null; size?: number }): React.JSX.Element {
  const initials = (displayName ?? '?').slice(0, 2).toUpperCase()
  if (photoUrl) {
    return <img src={photoUrl} alt={displayName ?? 'User'} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/15 flex items-center justify-center shrink-0`}>
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  )
}

function VerifiedIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-primary inline-block ml-0.5 -mt-px shrink-0">
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
      <div ref={ref} onClick={(e) => e.stopPropagation()} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-destructive/30 shadow-lg">
        <span className="text-xs text-foreground font-medium">Delete conversation?</span>
        <button
          onClick={() => { onDelete(convId); onClose() }}
          className="text-xs font-semibold text-destructive hover:underline"
        >
          Yes
        </button>
        <span className="text-muted-foreground text-xs">·</span>
        <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          No
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} onClick={(e) => e.stopPropagation()} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-background border border-border shadow-lg">
      <button
        onClick={() => { onPin(convId); onClose() }}
        title={isPinned ? 'Unpin' : 'Pin'}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
          isPinned ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
          <path d="M16 3a1 1 0 0 1 .707.293l4 4a1 1 0 0 1-1.032 1.649L17 8.236V14a1 1 0 0 1-.553.894l-4 2a1 1 0 0 1-1.341-.447L10 14.618l-3.553 3.553a1 1 0 0 1-1.414-1.414l3.553-3.553-1.829-1.106a1 1 0 0 1-.447-1.341l2-4A1 1 0 0 1 9 6h5.764l.67-2.684A1 1 0 0 1 16 3z" />
        </svg>
        {isPinned ? 'Unpin' : 'Pin'}
      </button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button
        onClick={() => { onArchive(convId); onClose() }}
        title="Archive"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" />
        </svg>
        Archive
      </button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button
        onClick={() => setConfirmDelete(true)}
        title="Delete"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  useEffect(() => { setPinned(getPinned()) }, [])

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

  useEffect(() => { void load() }, [load])

  // Shadow ref so socket handlers can read current convs without stale closures
  const convsRef = useRef<ConversationSummary[]>([])
  useEffect(() => { convsRef.current = convs }, [convs])

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
                  lastMessage: { body: payload.body ?? '', sentAt: new Date().toISOString(), senderId: payload.senderId },
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
        setArchived((prev) => [{ ...conv, archivedAt: new Date().toISOString(), isUserArchived: true }, ...prev])
      }
    } catch { /* noop */ }
  }

  const handleUnarchive = async (convId: string) => {
    try {
      await chatApi.unarchiveConversation(convId)
      const conv = archived.find((c) => c.id === convId)
      setArchived((prev) => prev.filter((c) => c.id !== convId))
      if (conv) {
        setConvs((prev) => [{ ...conv, archivedAt: null, isUserArchived: false, unreadCount: 0 }, ...prev])
      }
    } catch { /* noop */ }
  }

  const handleDelete = async (convId: string) => {
    try {
      await chatApi.hideConversation(convId)
      setConvs((prev) => prev.filter((c) => c.id !== convId))
    } catch { /* noop */ }
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
      <div className="h-full flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (convs.length === 0 && archived.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-primary" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            When you connect with someone on the map, your conversation will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" onClick={() => setActiveMenu(null)}>
      <div className="shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold font-display text-foreground mb-3">Messages</h1>
        <div className="relative">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {sorted.length === 0 && search && (
          <p className="text-sm text-center text-muted-foreground py-8">No conversations found</p>
        )}

        <div className="space-y-px">
          {sorted.map((conv) => {
            const isPinned = pinned.has(conv.id)
            const menuOpen = activeMenu === conv.id
            return (
              <div key={conv.id} className="relative group">
                <button
                  onClick={() => {
                    if (menuOpen) { setActiveMenu(null); return }
                    router.push(`/messages/${conv.otherUser.id}`)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar displayName={conv.otherUser.displayName} photoUrl={conv.otherUser.photoUrl} size={12} />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full bg-primary border-2 border-background flex items-center justify-center text-[9px] font-bold text-white px-0.5 leading-none">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5 min-w-0">
                        {isPinned && (
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-primary shrink-0 mr-0.5">
                            <path d="M16 3a1 1 0 0 1 .707.293l4 4a1 1 0 0 1-1.032 1.649L17 8.236V14a1 1 0 0 1-.553.894l-4 2a1 1 0 0 1-1.341-.447L10 14.618l-3.553 3.553a1 1 0 0 1-1.414-1.414l3.553-3.553-1.829-1.106a1 1 0 0 1-.447-1.341l2-4A1 1 0 0 1 9 6h5.764l.67-2.684A1 1 0 0 1 16 3z" />
                          </svg>
                        )}
                        <span className={['text-sm truncate', conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground'].join(' ')}>
                          {conv.otherUser.displayName ?? 'User'}
                        </span>
                        {conv.otherUser.verified && <VerifiedIcon />}
                      </div>
                      {conv.lastMessage && (
                        <span className={['text-[11px] shrink-0', conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'].join(' ')}>
                          {formatMessageTime(conv.lastMessage.sentAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className={['text-xs truncate flex-1 min-w-0', conv.unreadCount > 0 ? 'text-foreground/80 font-medium' : 'text-muted-foreground'].join(' ')}>
                        {conv.lastMessage?.body ?? 'Start a conversation'}
                      </p>
                      {conv.otherUser.distanceMiles != null && (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">
                          {conv.otherUser.distanceMiles < 0.5 ? '< 1 mi' : `${conv.otherUser.distanceMiles} mi`}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 3-dot menu trigger */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(menuOpen ? null : conv.id) }}
                    className={[
                      'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                      'opacity-0 group-hover:opacity-100',
                      menuOpen ? 'opacity-100 bg-muted' : 'hover:bg-muted',
                    ].join(' ')}
                    aria-label="Conversation options"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-muted-foreground">
                      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
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
              className="w-full flex items-center justify-between px-1 py-2 text-left group"
            >
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" />
                </svg>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Archived · {archived.length}
                </span>
              </div>
              <svg
                viewBox="0 0 24 24"
                className={['w-4 h-4 fill-none stroke-muted-foreground transition-transform', showArchive ? 'rotate-180' : ''].join(' ')}
                strokeWidth="2" strokeLinecap="round"
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
                      <div key={conv.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl">
                        <div className="relative shrink-0">
                          <Avatar displayName={conv.otherUser.displayName} photoUrl={conv.otherUser.photoUrl} size={11} />
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-none stroke-muted-foreground" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-0.5">
                            <span className="text-sm font-semibold text-foreground/70 truncate">
                              {conv.otherUser.displayName ?? 'User'}
                            </span>
                            {conv.otherUser.verified && <VerifiedIcon />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.isUserArchived ? 'Archived by you' : 'Inactive · 30 days'}
                          </p>
                        </div>
                        {conv.isUserArchived ? (
                          <button
                            onClick={() => void handleUnarchive(conv.id)}
                            className="shrink-0 h-7 px-3 rounded-full bg-muted text-foreground/70 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            Unarchive
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push('/upgrade')}
                            className="shrink-0 h-7 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
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
