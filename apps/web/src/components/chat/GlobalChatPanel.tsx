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
import Image from 'next/image'

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

function filterMessages(
  msgs: GlobalMessage[],
  myLocation: { lat: number; lng: number } | null,
  radiusMi: RadiusMi,
): GlobalMessage[] {
  if (radiusMi === null || myLocation === null) return msgs
  return msgs.filter((m) => withinRadius(m, myLocation.lat, myLocation.lng, radiusMi))
}

function Avatar({ msg, onClick }: { msg: GlobalMessage; onClick?: () => void }): React.JSX.Element {
  const initials = msg.displayName.slice(0, 2).toUpperCase()
  const cls =
    'w-8 h-8 rounded-full shrink-0 mt-0.5' +
    (onClick ? ' cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all' : '')
  if (msg.photoUrl) {
    return (
      <Image
        src={msg.photoUrl}
        alt={msg.displayName}
        width={32}
        height={32}
        className={`${cls} object-cover`}
        onClick={onClick}
      />
    )
  }
  return (
    <div className={`${cls} bg-primary/15 flex items-center justify-center`} onClick={onClick}>
      <span className="text-primary text-[11px] font-bold">{initials}</span>
    </div>
  )
}

function DateSeparator({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="my-3 flex items-center gap-3">
      <div className="bg-border/60 h-px flex-1" />
      <span className="text-muted-foreground text-[10px] font-medium">{label}</span>
      <div className="bg-border/60 h-px flex-1" />
    </div>
  )
}

function SendIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function groupByDate(
  messages: GlobalMessage[],
): Array<{ date: string; messages: GlobalMessage[] }> {
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

export function GlobalChatPanel({
  onClose,
  isAuthenticated,
  currentUserId,
  isMod,
}: Props): React.JSX.Element {
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
  const [picker, setPicker] = useState<{
    type: 'pin' | 'timeout'
    msg: GlobalMessage
    top: number
    left: number
  } | null>(null)
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
    locationApi
      .getMyLocation()
      .then((loc) => setMyLocation(loc))
      .catch(() => {
        /* no location set */
      })
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
      const [{ messages: msgs, hasMore: more }] = await Promise.all([chatApi.getGlobalMessages()])
      setMessages(msgs)
      setHasMore(more)
      setLoading(false)
      setTimeout(() => scrollToBottom('instant'), 50)

      const pin = await chatApi.getPinnedGlobalMessage().catch(() => null)
      if (pin) setPinned(pin)
    }

    fetchInitial().catch(() => setLoading(false))
    socket.emit('join_global')

    const onReconnect = () => {
      socket.emit('join_global')
    }
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
    return () => {
      socket.off('global_message', onGlobal)
    }
  }, [socket, scrollToBottom])

  useEffect(() => {
    const onCount = (count: number) => setActiveCount(count)
    socket.on('global_user_count', onCount)
    return () => {
      socket.off('global_user_count', onCount)
    }
  }, [socket])

  useEffect(() => {
    const onGlobalPinned = (data: PinnedMessage) => {
      setPinned(data)
      setPinnedDismissed(false)
    }
    socket.on('global_pinned', onGlobalPinned)
    return () => {
      socket.off('global_pinned', onGlobalPinned)
    }
  }, [socket])

  useEffect(() => {
    const onGlobalUnpinned = () => {
      setPinned(null)
      setPinnedDismissed(false)
    }
    socket.on('global_unpinned', onGlobalUnpinned)
    return () => {
      socket.off('global_unpinned', onGlobalUnpinned)
    }
  }, [socket])

  useEffect(() => {
    const onUserBanned = ({ userId }: { userId: string }) => {
      setMessages((prev) => prev.filter((m) => m.userId !== userId))
    }
    socket.on('global_user_banned', onUserBanned)
    return () => {
      socket.off('global_user_banned', onUserBanned)
    }
  }, [socket])

  useEffect(() => {
    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }
    socket.on('global_message_deleted', onDeleted)
    return () => {
      socket.off('global_message_deleted', onDeleted)
    }
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
            setTimeout(() => {
              socket.connect()
            }, 300)
          })
      }
    }
    socket.on('chat_error', onError)
    return () => {
      socket.off('chat_error', onError)
    }
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
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRadiusChange = (value: RadiusMi) => {
    setRadiusMi(value)
    localStorage.setItem(RADIUS_KEY, value === null ? 'null' : String(value))
  }

  const openPicker = (
    type: 'pin' | 'timeout',
    msg: GlobalMessage,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
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
    } catch {
      /* noop */
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatApi.deleteGlobalMessage(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch {
      /* noop */
    }
  }

  const handleTimeoutUser = async (userId: string, minutes: number) => {
    try {
      await chatApi.timeoutUserFromChat(userId, minutes)
      toast.success('User timed out.')
    } catch {
      /* noop */
    }
  }

  const handleBanUser = async (userId: string) => {
    try {
      await chatApi.banUserFromChat(userId)
      toast.success('User banned and messages removed.')
    } catch {
      /* noop */
    }
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
        className="absolute inset-x-0 bottom-0 z-[60] flex flex-col sm:inset-x-auto sm:right-0 sm:w-[400px]"
        style={{ height: '68%' }}
      >
        {/* Glass background */}
        <div className="bg-background border-border absolute inset-0 border-t sm:rounded-tl-xl sm:border-l dark:bg-[hsl(260_28%_5%)]" />

        {/* Drag handle */}
        <button
          onClick={onClose}
          className="relative z-10 flex w-full shrink-0 justify-center pb-1 pt-2.5"
          aria-label="Close chat"
        >
          <div className="bg-border hover:bg-muted-foreground/40 h-1 w-9 rounded-full transition-colors" />
        </button>

        {/* Header */}
        <div className="border-border/70 relative z-10 flex shrink-0 items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              {connected ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </>
              ) : (
                <span className="bg-destructive relative inline-flex h-1.5 w-1.5 rounded-full" />
              )}
            </span>
            <span className="font-display text-foreground text-sm font-bold">Global</span>
            {activeCount !== null && (
              <span className="text-muted-foreground text-[11px]">{activeCount} here</span>
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
                      'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
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
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pinned banner */}
        {showPinned && (
          <div className="bg-primary/[0.08] border-primary/20 relative z-10 flex shrink-0 items-center gap-2 border-b px-4 py-2">
            <svg viewBox="0 0 16 16" className="fill-primary h-3.5 w-3.5 shrink-0">
              <path d="M10.667 2a.667.667 0 0 1 .471.195l2.667 2.667a.667.667 0 0 1-.688 1.099L11.333 5.49V9.333a.667.667 0 0 1-.369.597l-2.666 1.333a.667.667 0 0 1-.894-.298L6.667 9.745l-2.37 2.37a.667.667 0 0 1-.942-.942L5.724 8.8 4.505 8.07a.667.667 0 0 1-.298-.894l1.333-2.667A.667.667 0 0 1 6.137 4h3.843l.446-1.789A.667.667 0 0 1 10.667 2z" />
            </svg>
            <div className="min-w-0 flex-1">
              <span className="text-primary text-[10px] font-semibold uppercase tracking-wide">
                Pinned · {pinned.senderName}
              </span>
              <p className="text-foreground truncate text-xs">{pinned.body}</p>
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
              className="text-muted-foreground hover:text-foreground flex h-5 w-5 shrink-0 items-center justify-center"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 4L4 12M4 4l8 8" />
              </svg>
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}

          {!loading && (
            <>
              {hasMore && (
                <div className="mb-3 flex justify-center">
                  <button
                    onClick={loadEarlier}
                    disabled={loadingEarlier}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingEarlier ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3 fill-none stroke-current"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    Load earlier
                  </button>
                </div>
              )}

              {visible.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-foreground text-sm font-semibold">No messages yet</p>
                  <p className="text-muted-foreground text-xs">
                    {radiusMi !== null && myLocation
                      ? `No messages within ${radiusMi} miles.`
                      : isAuthenticated
                        ? 'Say hello to kick things off.'
                        : 'Sign up to start chatting.'}
                  </p>
                </div>
              )}

              {grouped.map((group) => (
                <div key={group.date}>
                  <DateSeparator label={group.date} />
                  <div className="space-y-3">
                    {group.messages.map((msg) => {
                      const isMine = !!currentUserId && msg.userId === currentUserId
                      const distKm =
                        !isMine && myLocation && msg.lat !== undefined && msg.lng !== undefined
                          ? haversineKm(myLocation.lat, myLocation.lng, msg.lat, msg.lng)
                          : null

                      if (isMine) {
                        return (
                          <div
                            key={msg.id}
                            className="group/msg flex items-end justify-end gap-2.5"
                          >
                            <div className="max-w-[72%]">
                              <div className="flex flex-wrap items-baseline justify-end gap-1.5">
                                {isMod && (
                                  <span className="opacity-0 transition-opacity group-hover/msg:opacity-100">
                                    <button
                                      onClick={() => void handleDeleteMessage(msg.id)}
                                      title="Delete message"
                                      className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex h-5 w-5 items-center justify-center rounded transition-colors"
                                    >
                                      <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current">
                                        <path d="M6 2h4a1 1 0 0 1 1 1v1H5V3a1 1 0 0 1 1-1zM3 5h10l-.8 8H3.8L3 5zm3 2v4h1V7H6zm3 0v4h1V7H9z" />
                                      </svg>
                                    </button>
                                  </span>
                                )}
                                <span className="text-muted-foreground shrink-0 text-[10px]">
                                  {formatMessageTime(msg.sentAt)}
                                </span>
                                <span className="text-foreground max-w-[120px] truncate text-xs font-semibold">
                                  You
                                </span>
                              </div>
                              <p className="bg-primary ml-auto mt-0.5 w-fit break-words rounded-2xl rounded-br-sm px-3.5 py-2 text-sm leading-relaxed text-white">
                                {msg.body}
                              </p>
                            </div>
                            <Avatar msg={msg} />
                          </div>
                        )
                      }

                      return (
                        <div key={msg.id} className="group/msg flex min-w-0 items-start gap-2.5">
                          <Avatar
                            msg={msg}
                            onClick={() => {
                              setViewingUserId(msg.userId)
                              setViewingUserName(msg.displayName)
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setViewingUserId(msg.userId)
                                  setViewingUserName(msg.displayName)
                                }}
                                className="text-foreground hover:text-primary max-w-[120px] truncate text-xs font-semibold transition-colors"
                              >
                                {msg.displayName}
                              </button>
                              <span className="text-muted-foreground shrink-0 text-[10px]">
                                {formatMessageTime(msg.sentAt)}
                              </span>
                              {distKm !== null && (
                                <span className="text-muted-foreground/70 shrink-0 text-[10px]">
                                  · {formatDist(distKm)}
                                </span>
                              )}
                              {isMod && (
                                <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
                                  <button
                                    onClick={(e) => openPicker('pin', msg, e)}
                                    title="Pin message"
                                    className="text-muted-foreground/50 hover:text-primary hover:bg-primary/10 flex h-5 w-5 items-center justify-center rounded transition-colors"
                                  >
                                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                                      <path d="M10.667 2a.667.667 0 0 1 .471.195l2.667 2.667a.667.667 0 0 1-.688 1.099L11.333 5.49V9.333a.667.667 0 0 1-.369.597l-2.666 1.333a.667.667 0 0 1-.894-.298L6.667 9.745l-2.37 2.37a.667.667 0 0 1-.942-.942L5.724 8.8 4.505 8.07a.667.667 0 0 1-.298-.894l1.333-2.667A.667.667 0 0 1 6.137 4h3.843l.446-1.789A.667.667 0 0 1 10.667 2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => openPicker('timeout', msg, e)}
                                    title="Timeout user"
                                    className="text-muted-foreground/50 flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-amber-400/10 hover:text-amber-400"
                                  >
                                    <svg
                                      viewBox="0 0 16 16"
                                      className="h-3.5 w-3.5 fill-none stroke-current"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                    >
                                      <circle cx="8" cy="8" r="6" />
                                      <path d="M8 5v3l2 1.5" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => void handleBanUser(msg.userId)}
                                    title="Ban user"
                                    className="text-muted-foreground/50 flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-red-500/10 hover:text-red-500"
                                  >
                                    <svg
                                      viewBox="0 0 16 16"
                                      className="h-3.5 w-3.5 fill-none stroke-current"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                    >
                                      <circle cx="8" cy="8" r="6" />
                                      <path d="M4.5 4.5l7 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteMessage(msg.id)}
                                    title="Delete message"
                                    className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex h-5 w-5 items-center justify-center rounded transition-colors"
                                  >
                                    <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current">
                                      <path d="M6 2h4a1 1 0 0 1 1 1v1H5V3a1 1 0 0 1 1-1zM3 5h10l-.8 8H3.8L3 5zm3 2v4h1V7H6zm3 0v4h1V7H9z" />
                                    </svg>
                                  </button>
                                </span>
                              )}
                            </div>
                            <p className="text-foreground/90 mt-0.5 break-words text-sm leading-relaxed">
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
        <div className="border-border/70 relative z-10 shrink-0 border-t px-4 py-3">
          {chatError && <p className="text-destructive mb-2 text-center text-xs">{chatError}</p>}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Post a message…"
                maxLength={500}
                className="bg-muted/70 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-10 flex-1 rounded-2xl border px-4 text-sm focus:outline-none focus:ring-1 dark:bg-white/[0.08]"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="Send"
              >
                <SendIcon />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/signup')}
                className="bg-primary h-10 flex-1 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Sign up to chat
              </button>
              <button
                onClick={() => router.push('/')}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 h-10 flex-1 rounded-2xl border text-sm font-medium transition-colors"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mod picker — portaled to document.body so it's above the transformed panel */}
      {picker &&
        createPortal(
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 9998 }}
              onClick={() => setPicker(null)}
            />
            <div
              className="border-border fixed w-28 rounded-xl border py-1 shadow-xl"
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
                  className="text-foreground hover:bg-muted w-full px-3 py-1.5 text-left text-xs transition-colors"
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
          isAuthenticated={isAuthenticated}
          displayName={viewingUserName}
          onClose={() => setViewingUserId(null)}
          onMessage={() => setViewingUserId(null)}
        />
      )}
    </>
  )
}
