'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { chatApi, formatMessageTime, formatMessageDate, type PinnedMessage } from '@/lib/chat'
import { locationApi } from '@/lib/location'
import { useSocket } from '@/hooks/use-socket'
import { toast } from '@/lib/toast'
import { UserProfileDrawer } from '@/components/map/UserProfileDrawer'
import type { GlobalMessage } from '@dating-app/types'

interface Props {
  onClose: () => void
  isAuthenticated: boolean
  currentUserId?: string
  isMod?: boolean
}

const RADIUS_OPTIONS = [
  { label: 'All', value: null },
  { label: '5mi', value: 5 },
  { label: '10mi', value: 10 },
  { label: '25mi', value: 25 },
  { label: '50mi', value: 50 },
] as const

type RadiusMi = null | 5 | 10 | 25 | 50

const RADIUS_KEY = 'crush_chat_radius'
const KM_PER_MILE = 1.60934

const PIN_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '12 hours', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
  { label: '1 week', minutes: 10080 },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function withinRadius(msg: GlobalMessage, myLat: number, myLng: number, radiusMi: number): boolean {
  if (msg.lat === undefined || msg.lng === undefined) return true
  return haversineKm(myLat, myLng, msg.lat, msg.lng) <= radiusMi * KM_PER_MILE
}

function filterMessages(msgs: GlobalMessage[], myLocation: { lat: number; lng: number } | null, radiusMi: RadiusMi): GlobalMessage[] {
  if (radiusMi === null || myLocation === null) return msgs
  return msgs.filter((m) => withinRadius(m, myLocation.lat, myLocation.lng, radiusMi))
}

function Avatar({ msg, onClick }: { msg: GlobalMessage; onClick?: () => void }): React.JSX.Element {
  const initials = msg.displayName.slice(0, 2).toUpperCase()
  const cls = 'w-8 h-8 rounded-full shrink-0 mt-0.5' + (onClick ? ' cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all' : '')
  if (msg.photoUrl) {
    return <img src={msg.photoUrl} alt={msg.displayName} className={`${cls} object-cover`} onClick={onClick} />
  }
  return (
    <div className={`${cls} bg-primary/15 flex items-center justify-center`} onClick={onClick}>
      <span className="text-[11px] font-bold text-primary">{initials}</span>
    </div>
  )
}

function DateSeparator({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  )
}

function SendIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function groupByDate(messages: GlobalMessage[]): Array<{ date: string; messages: GlobalMessage[] }> {
  const groups: Array<{ date: string; messages: GlobalMessage[] }> = []
  for (const msg of messages) {
    const label = formatMessageDate(msg.sentAt)
    const last = groups[groups.length - 1]
    if (last?.date === label) {
      last.messages.push(msg)
    } else {
      groups.push({ date: label, messages: [msg] })
    }
  }
  return groups
}

function formatDist(km: number): string {
  const mi = km / KM_PER_MILE
  if (mi < 0.5) return '< 1 mi'
  return `~${Math.round(mi)} mi`
}

const TIMEOUT_OPTIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '12 hours', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
  { label: '1 week', minutes: 10080 },
]

export function GlobalChatPanel({ onClose, isAuthenticated, currentUserId, isMod }: Props): React.JSX.Element {
  const router = useRouter()
  const socket = useSocket()
  const [messages, setMessages] = useState<GlobalMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [text, setText] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const [connected, setConnected] = useState(socket.connected)
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [radiusMi, setRadiusMi] = useState<RadiusMi>(null)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [viewingUserName, setViewingUserName] = useState<string | null>(null)
  const [pinned, setPinned] = useState<PinnedMessage | null>(null)
  const [pinnedDismissed, setPinnedDismissed] = useState(false)
  const [picker, setPicker] = useState<{ type: 'pin' | 'timeout'; msg: GlobalMessage; top: number; left: number } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const saved = localStorage.getItem(RADIUS_KEY)
    if (saved && saved !== 'null') {
      const n = parseInt(saved, 10)
      setRadiusMi(([5, 10, 25, 50] as number[]).includes(n) ? (n as RadiusMi) : null)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    locationApi.getMyLocation()
      .then((loc) => setMyLocation(loc))
      .catch(() => {/* no location set */})
  }, [isAuthenticated])

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [socket])

  useEffect(() => {
    const fetchInitial = async () => {
      const [{ messages: msgs, hasMore: more }] = await Promise.all([
        chatApi.getGlobalMessages(),
      ])
      setMessages(msgs)
      setHasMore(more)
      setLoading(false)
      setTimeout(() => scrollToBottom('instant'), 50)

      const pin = await chatApi.getPinnedGlobalMessage().catch(() => null)
      if (pin) setPinned(pin)
    }

    fetchInitial().catch(() => setLoading(false))
    socket.emit('join_global')

    const onReconnect = () => { socket.emit('join_global') }
    socket.on('connect', onReconnect)

    return () => {
      // Don't leave the global room here — stay in it so the nav badge
      // can count messages while the panel is closed. The layout handles
      // leave_global when the user navigates away from /map.
      socket.off('connect', onReconnect)
    }
  }, [socket, isAuthenticated, scrollToBottom])

  useEffect(() => {
    const onGlobal = (msg: GlobalMessage) => {
      setMessages((prev) => [...prev, msg])
      setTimeout(() => scrollToBottom(), 50)
    }
    socket.on('global_message', onGlobal)
    return () => { socket.off('global_message', onGlobal) }
  }, [socket, scrollToBottom])

  useEffect(() => {
    const onCount = (count: number) => setActiveCount(count)
    socket.on('global_user_count', onCount)
    return () => { socket.off('global_user_count', onCount) }
  }, [socket])

  useEffect(() => {
    const onGlobalPinned = (data: PinnedMessage) => {
      setPinned(data)
      setPinnedDismissed(false)
    }
    socket.on('global_pinned', onGlobalPinned)
    return () => { socket.off('global_pinned', onGlobalPinned) }
  }, [socket])

  useEffect(() => {
    const onGlobalUnpinned = () => {
      setPinned(null)
      setPinnedDismissed(false)
    }
    socket.on('global_unpinned', onGlobalUnpinned)
    return () => { socket.off('global_unpinned', onGlobalUnpinned) }
  }, [socket])

  useEffect(() => {
    const onUserBanned = ({ userId }: { userId: string }) => {
      setMessages((prev) => prev.filter((m) => m.userId !== userId))
    }
    socket.on('global_user_banned', onUserBanned)
    return () => { socket.off('global_user_banned', onUserBanned) }
  }, [socket])

  useEffect(() => {
    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }
    socket.on('global_message_deleted', onDeleted)
    return () => { socket.off('global_message_deleted', onDeleted) }
  }, [socket])

  useEffect(() => {
    const onError = (msg: string) => {
      setChatError(msg)
      setTimeout(() => setChatError(null), 3000)
      if (msg.startsWith('Session expired')) {
        fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
          .catch(() => null)
          .finally(() => {
            socket.disconnect()
            setTimeout(() => { socket.connect() }, 300)
          })
      }
    }
    socket.on('chat_error', onError)
    return () => { socket.off('chat_error', onError) }
  }, [socket])

  const loadEarlier = useCallback(async () => {
    const oldest = messages[0]
    if (!oldest || loadingEarlier) return
    const before = new Date(oldest.sentAt).getTime()
    setLoadingEarlier(true)
    try {
      const prevScrollHeight = scrollRef.current?.scrollHeight ?? 0
      const { messages: earlier, hasMore: more } = await chatApi.getGlobalMessages(before)
      setMessages((prev) => [...earlier, ...prev])
      setHasMore(more)
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight
        }
      })
    } finally {
      setLoadingEarlier(false)
    }
  }, [messages, loadingEarlier])

  const handleSend = useCallback(() => {
    const body = text.trim()
    if (!body) return
    if (!socket.connected) {
      setChatError('Not connected — try refreshing the page.')
      return
    }
    setText('')
    socket.emit('send_global_message', body)
  }, [text, socket])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend() }
  }

  const handleRadiusChange = (value: RadiusMi) => {
    setRadiusMi(value)
    localStorage.setItem(RADIUS_KEY, value === null ? 'null' : String(value))
  }

  const openPicker = (type: 'pin' | 'timeout', msg: GlobalMessage, e: React.MouseEvent<HTMLButtonElement>) => {
    const btnRect = e.currentTarget.getBoundingClientRect()
    const menuH = type === 'pin' ? 210 : 180
    let top = btnRect.top - menuH - 4
    if (top < 0) top = btnRect.bottom + 4
    let left = btnRect.left
    if (left + 112 > window.innerWidth) left = window.innerWidth - 116
    setPicker({ type, msg, top, left })
  }

  const handlePinMessage = async (msg: GlobalMessage, minutes: number) => {
    try {
      const result = await chatApi.pinGlobalMessage(msg.id, msg.body, msg.displayName, minutes)
      setPinned(result)
      setPinnedDismissed(false)
    } catch { /* noop */ }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatApi.deleteGlobalMessage(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch { /* noop */ }
  }

  const handleTimeoutUser = async (userId: string, minutes: number) => {
    try {
      await chatApi.timeoutUserFromChat(userId, minutes)
      toast.success('User timed out.')
    } catch { /* noop */ }
  }

  const handleBanUser = async (userId: string) => {
    try {
      await chatApi.banUserFromChat(userId)
      toast.success('User banned and messages removed.')
    } catch { /* noop */ }
  }

  const visible = filterMessages(messages, myLocation, radiusMi)
  const grouped = groupByDate(visible)
  const showPinned = pinned && !pinnedDismissed && new Date(pinned.pinnedUntil) > new Date()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', damping: 32, stiffness: 350 }}
        className="absolute inset-x-0 sm:inset-x-auto sm:right-0 sm:w-[400px] bottom-0 z-[60] flex flex-col"
        style={{ height: '68%' }}
      >
        {/* Glass background */}
        <div className="absolute inset-0 bg-background dark:bg-[hsl(260_28%_5%)] border-t sm:border-l border-border sm:rounded-tl-xl" />

        {/* Drag handle */}
        <button
          onClick={onClose}
          className="relative z-10 w-full flex justify-center pt-2.5 pb-1 shrink-0"
          aria-label="Close chat"
        >
          <div className="w-9 h-1 rounded-full bg-border hover:bg-muted-foreground/40 transition-colors" />
        </button>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              {connected
                ? <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></>
                : <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
              }
            </span>
            <span className="text-sm font-bold font-display text-foreground">Global</span>
            {activeCount !== null && (
              <span className="text-[11px] text-muted-foreground">{activeCount} here</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isAuthenticated && (
              <div className="flex items-center gap-0.5">
                {RADIUS_OPTIONS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => handleRadiusChange(value)}
                    className={[
                      'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                      radiusMi === value
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pinned banner */}
        {showPinned && (
          <div className="relative z-10 flex items-center gap-2 px-4 py-2 bg-primary/8 border-b border-primary/20 shrink-0">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-primary shrink-0">
              <path d="M10.667 2a.667.667 0 0 1 .471.195l2.667 2.667a.667.667 0 0 1-.688 1.099L11.333 5.49V9.333a.667.667 0 0 1-.369.597l-2.666 1.333a.667.667 0 0 1-.894-.298L6.667 9.745l-2.37 2.37a.667.667 0 0 1-.942-.942L5.724 8.8 4.505 8.07a.667.667 0 0 1-.298-.894l1.333-2.667A.667.667 0 0 1 6.137 4h3.843l.446-1.789A.667.667 0 0 1 10.667 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Pinned · {pinned.senderName}</span>
              <p className="text-xs text-foreground truncate">{pinned.body}</p>
            </div>
            <button
              onClick={() => {
                if (isMod) {
                  chatApi.unpinGlobalMessage().catch(() => null)
                } else {
                  setPinnedDismissed(true)
                }
              }}
              title={isMod ? 'Remove pin' : 'Dismiss'}
              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
            >
              <svg viewBox="0 0 16 16" className="w-3 h-3 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                <path d="M12 4L4 12M4 4l8 8" />
              </svg>
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {hasMore && (
                <div className="flex justify-center mb-3">
                  <button
                    onClick={loadEarlier}
                    disabled={loadingEarlier}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/60 transition-colors disabled:opacity-50"
                  >
                    {loadingEarlier ? (
                      <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    Load earlier
                  </button>
                </div>
              )}

              {visible.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-semibold text-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground">
                    {radiusMi !== null && myLocation
                      ? `No messages within ${radiusMi} miles.`
                      : isAuthenticated ? 'Say hello to kick things off.' : 'Sign up to start chatting.'}
                  </p>
                </div>
              )}

              {grouped.map((group) => (
                <div key={group.date}>
                  <DateSeparator label={group.date} />
                  <div className="space-y-3">
                    {group.messages.map((msg) => {
                      const isMine = !!currentUserId && msg.userId === currentUserId
                      const distKm = !isMine && myLocation && msg.lat !== undefined && msg.lng !== undefined
                        ? haversineKm(myLocation.lat, myLocation.lng, msg.lat, msg.lng)
                        : null

                      if (isMine) {
                        return (
                          <div key={msg.id} className="flex items-end gap-2.5 justify-end group/msg">
                            <div className="max-w-[72%]">
                              <div className="flex items-baseline gap-1.5 justify-end flex-wrap">
                                {isMod && (
                                  <span className="opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                    <button onClick={() => void handleDeleteMessage(msg.id)} title="Delete message"
                                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                      <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current"><path d="M6 2h4a1 1 0 0 1 1 1v1H5V3a1 1 0 0 1 1-1zM3 5h10l-.8 8H3.8L3 5zm3 2v4h1V7H6zm3 0v4h1V7H9z"/></svg>
                                    </button>
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground shrink-0">{formatMessageTime(msg.sentAt)}</span>
                                <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">You</span>
                              </div>
                              <p className="w-fit ml-auto text-sm leading-relaxed break-words px-3.5 py-2 rounded-2xl rounded-br-sm bg-primary text-white mt-0.5">
                                {msg.body}
                              </p>
                            </div>
                            <Avatar msg={msg} />
                          </div>
                        )
                      }

                      return (
                        <div key={msg.id} className="flex items-start gap-2.5 min-w-0 group/msg">
                          <Avatar
                            msg={msg}
                            onClick={() => { setViewingUserId(msg.userId); setViewingUserName(msg.displayName) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => { setViewingUserId(msg.userId); setViewingUserName(msg.displayName) }}
                                className="text-xs font-semibold text-foreground truncate max-w-[120px] hover:text-primary transition-colors"
                              >
                                {msg.displayName}
                              </button>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatMessageTime(msg.sentAt)}
                              </span>
                              {distKm !== null && (
                                <span className="text-[10px] text-muted-foreground/70 shrink-0">
                                  · {formatDist(distKm)}
                                </span>
                              )}
                              {isMod && (
                                <span className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                  <button onClick={(e) => openPicker('pin', msg, e)} title="Pin message"
                                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                                      <path d="M10.667 2a.667.667 0 0 1 .471.195l2.667 2.667a.667.667 0 0 1-.688 1.099L11.333 5.49V9.333a.667.667 0 0 1-.369.597l-2.666 1.333a.667.667 0 0 1-.894-.298L6.667 9.745l-2.37 2.37a.667.667 0 0 1-.942-.942L5.724 8.8 4.505 8.07a.667.667 0 0 1-.298-.894l1.333-2.667A.667.667 0 0 1 6.137 4h3.843l.446-1.789A.667.667 0 0 1 10.667 2z" />
                                    </svg>
                                  </button>
                                  <button onClick={(e) => openPicker('timeout', msg, e)} title="Timeout user"
                                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round">
                                      <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 1.5" />
                                    </svg>
                                  </button>
                                  <button onClick={() => void handleBanUser(msg.userId)} title="Ban user"
                                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round">
                                      <circle cx="8" cy="8" r="6" /><path d="M4.5 4.5l7 7" />
                                    </svg>
                                  </button>
                                  <button onClick={() => void handleDeleteMessage(msg.id)} title="Delete message"
                                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current"><path d="M6 2h4a1 1 0 0 1 1 1v1H5V3a1 1 0 0 1 1-1zM3 5h10l-.8 8H3.8L3 5zm3 2v4h1V7H6zm3 0v4h1V7H9z"/></svg>
                                  </button>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed break-words mt-0.5">
                              {msg.body}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input / CTA */}
        <div className="relative z-10 shrink-0 border-t border-border/70 px-4 py-3">
          {chatError && (
            <p className="text-xs text-destructive mb-2 text-center">{chatError}</p>
          )}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Post a message…"
                maxLength={500}
                className="flex-1 h-10 px-4 rounded-2xl bg-muted/70 dark:bg-white/8 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity"
                aria-label="Send"
              >
                <SendIcon />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/signup')}
                className="flex-1 h-10 rounded-2xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Sign up to chat
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 h-10 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mod picker — portaled to document.body so it's above the transformed panel */}
      {picker && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setPicker(null)}
          />
          <div
            className="fixed rounded-xl border border-border shadow-xl py-1 w-28"
            style={{
              zIndex: 9999,
              top: picker.top,
              left: picker.left,
              backgroundColor: 'hsl(var(--card))',
            }}
          >
            {(picker.type === 'pin' ? PIN_OPTIONS : TIMEOUT_OPTIONS).map(({ label, minutes }) => (
              <button
                key={minutes}
                onClick={() => {
                  if (picker.type === 'pin') void handlePinMessage(picker.msg, minutes)
                  else void handleTimeoutUser(picker.msg.userId, minutes)
                  setPicker(null)
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}

      {/* Profile drawer (renders outside the panel so it overlays the full map) */}
      {viewingUserId && (
        <UserProfileDrawer
          userId={viewingUserId}
          displayName={viewingUserName}
          onClose={() => setViewingUserId(null)}
          onMessage={() => setViewingUserId(null)}
        />
      )}
    </>
  )
}
