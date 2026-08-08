'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { chatApi, type ConversationDetail, type PinnedMessage } from '@/lib/chat'
import { formatMessageDate, formatMessageTime } from '@/lib/chat'
import { useSocket } from '@/hooks/use-socket'
import { useAuth } from '@/hooks/use-auth'
import { useSubscription } from '@/hooks/use-subscription'
import { toast } from '@/lib/toast'
import { UserProfileDrawer } from '@/components/map/UserProfileDrawer'
import { BlockReportSheet } from '@/components/ui/block-report-sheet'
import type { MessageDto } from '@dating-app/types'

// ── Icons ────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}
function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
function MicIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={['h-5 w-5 fill-none stroke-current', active ? 'text-red-400' : ''].join(' ')}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0014 0M12 19v4M8 23h8" />
    </svg>
  )
}
function VerifiedIcon() {
  return (
    <svg viewBox="0 0 16 16" className="fill-primary h-3.5 w-3.5 shrink-0">
      <path d="M8 1l1.48 3.01 3.32.48-2.4 2.34.57 3.3L8 8.57 5.03 10.13l.57-3.3-2.4-2.34 3.32-.48z" />
    </svg>
  )
}

// ── Pinned message banner ─────────────────────────────────────────
function PinnedBanner({ pinned, onDismiss }: { pinned: PinnedMessage; onDismiss: () => void }) {
  return (
    <div className="border-primary/20 bg-primary/[0.06] dark:bg-primary/[0.12] flex shrink-0 items-center gap-2.5 border-b py-2 pl-3 pr-3">
      <div className="bg-primary h-7 w-[3px] shrink-0 rounded-full" />
      <svg viewBox="0 0 16 16" className="fill-primary h-3 w-3 shrink-0 opacity-70">
        <path d="M10.667 2a.667.667 0 0 1 .471.195l2.667 2.667a.667.667 0 0 1-.688 1.099L11.333 5.49V9.333a.667.667 0 0 1-.369.597l-2.666 1.333a.667.667 0 0 1-.894-.298L6.667 9.745l-2.37 2.37a.667.667 0 0 1-.942-.942L5.724 8.8 4.505 8.07a.667.667 0 0 1-.298-.894l1.333-2.667A.667.667 0 0 1 6.137 4h3.843l.446-1.789A.667.667 0 0 1 10.667 2z" />
      </svg>
      <div className="min-w-0 flex-1">
        <span className="text-primary text-[10px] font-semibold uppercase tracking-wide">
          Pinned
        </span>
        <p className="text-foreground truncate text-xs leading-snug">{pinned.body}</p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss pinned message"
        className="text-muted-foreground hover:text-foreground hover:bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors"
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
  )
}

// ── Date separator ───────────────────────────────────────────────
function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
      <div className="bg-border h-px flex-1" />
    </div>
  )
}

// ── Voice player ─────────────────────────────────────────────────
function VoicePlayer({ src, isMine }: { src: string; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
    } else {
      void el.play()
    }
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      className={[
        'flex min-w-[160px] items-center gap-2.5 rounded-2xl px-3 py-2',
        isMine ? 'bg-primary rounded-br-sm text-white' : 'bg-muted text-foreground rounded-bl-sm',
      ].join(' ')}
    >
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
        }}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
      />
      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
      >
        {playing ? (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-current transition-all"
            style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
          />
        </div>
        <span
          className={['text-[10px]', isMine ? 'text-white/70' : 'text-muted-foreground'].join(' ')}
        >
          {fmt(playing ? progress : duration)}
        </span>
      </div>
    </div>
  )
}

// ── Message bubble ───────────────────────────────────────────────
function MessageBubble({
  msg,
  isMine,
  showSeen,
  isPremium,
}: {
  msg: MessageDto
  isMine: boolean
  showSeen: boolean
  isPremium: boolean
}) {
  const isVoice = msg.mediaType === 'voice'
  const isImage = msg.mediaType === 'photo'
  const isDeleted = !!msg.deletedAt
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen])

  return (
    <div className={['flex flex-col', isMine ? 'items-end' : 'items-start'].join(' ')}>
      {isDeleted ? (
        <div className="border-border max-w-[75%] rounded-2xl border px-4 py-2.5">
          <p className="text-muted-foreground/60 text-xs italic">Message deleted</p>
        </div>
      ) : isVoice && msg.mediaUrl ? (
        <>
          <VoicePlayer src={msg.mediaUrl} isMine={isMine} />
          <span className="text-muted-foreground mt-0.5 px-1 text-[10px]">
            {formatMessageTime(msg.sentAt)}
          </span>
        </>
      ) : isImage && msg.mediaUrl ? (
        <div
          className={['flex max-w-[75%] flex-col gap-1', isMine ? 'items-end' : 'items-start'].join(
            ' ',
          )}
        >
          <button onClick={() => setLightboxOpen(true)} className="focus:outline-none">
            <Image
              src={msg.mediaUrl}
              alt="Image"
              width={0}
              height={0}
              sizes="288px"
              className={[
                'max-h-72 w-auto cursor-zoom-in rounded-2xl object-cover transition-opacity hover:opacity-90',
                isMine ? 'rounded-br-sm' : 'rounded-bl-sm',
              ].join(' ')}
            />
          </button>
          {msg.body && (
            <div
              className={[
                'rounded-2xl px-4 py-2 text-sm',
                isMine
                  ? 'bg-primary self-end rounded-br-sm text-white'
                  : 'bg-muted text-foreground self-start rounded-bl-sm dark:bg-white/10',
              ].join(' ')}
            >
              <p className="break-words leading-relaxed">{msg.body}</p>
            </div>
          )}
          <span className="text-muted-foreground px-1 text-[10px]">
            {formatMessageTime(msg.sentAt)}
          </span>

          <AnimatePresence>
            {lightboxOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
                onClick={() => setLightboxOpen(false)}
              >
                <motion.img
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  src={msg.mediaUrl}
                  alt="Image"
                  className="max-h-full max-w-full select-none rounded-xl object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 fill-none stroke-current"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <>
          <div
            className={[
              'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
              isMine
                ? 'bg-primary rounded-br-sm text-white'
                : 'bg-muted text-foreground rounded-bl-sm dark:bg-white/10',
            ].join(' ')}
          >
            <p className="break-words leading-relaxed">{msg.body}</p>
          </div>
          <div
            className={[
              'mt-0.5 flex items-center gap-1 px-1',
              isMine ? 'justify-end' : 'justify-start',
            ].join(' ')}
          >
            {msg.editedAt && (
              <span className="text-muted-foreground text-[10px] italic">edited</span>
            )}
            <span className="text-muted-foreground text-[10px]">
              {formatMessageTime(msg.sentAt)}
            </span>
          </div>
        </>
      )}
      {isMine && showSeen && isPremium && !isDeleted && (
        <span className="text-muted-foreground mt-0.5 px-1 text-[10px]">Seen</span>
      )}
    </div>
  )
}

function groupByDate(messages: MessageDto[]): Array<{ date: string; messages: MessageDto[] }> {
  const groups: Array<{ date: string; messages: MessageDto[] }> = []
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

// ── Voice recorder hook ──────────────────────────────────────────
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(100)
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
      return true
    } catch {
      return false
    }
  }, [])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        setRecording(false)
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        recorder.stream.getTracks().forEach((t) => t.stop())
        recorderRef.current = null
        setRecording(false)
        setDuration(0)
        resolve(blob.size > 0 ? blob : null)
      }
      recorder.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stream.getTracks().forEach((t) => t.stop())
      recorder.stop()
      recorderRef.current = null
    }
    setRecording(false)
    setDuration(0)
  }, [])

  return { recording, duration, start, stop, cancel }
}

// ── Main page ────────────────────────────────────────────────────
export default function DmThreadPage() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const socket = useSocket()
  const { user } = useAuth()
  const { isPremium } = useSubscription(!!user)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conv, setConv] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [seenByOther, setSeenByOther] = useState(false)
  const [sendingVoice, setSendingVoice] = useState(false)
  const [sendingImage, setSendingImage] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<{ file: File; previewUrl: string } | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showBlockReport, setShowBlockReport] = useState(false)
  const [pinned, setPinned] = useState<PinnedMessage | null>(null)
  const [pinnedDismissed, setPinnedDismissed] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const otherTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { recording, duration, start, stop, cancel } = useVoiceRecorder()

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    let convId: string

    const init = async () => {
      try {
        const { id } = await chatApi.startDm(params.userId)
        convId = id
        setConversationId(id)

        const [msgs, detail, pin] = await Promise.all([
          chatApi.getMessages(id),
          chatApi.getConversation(id),
          chatApi.getPinnedConvMessage(id).catch(() => null),
        ])
        setMessages(msgs)
        setConv(detail)
        if (pin) setPinned(pin)
        setLoading(false)
        requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom('instant')))
        socket.emit('join_room', id)
        // Mark read immediately so the nav badge clears without waiting for unmount
        socket.emit('mark_read', id)
        window.dispatchEvent(new CustomEvent('crush_mark_read'))
      } catch {
        setLoading(false)
      }
    }

    void init()
    return () => {
      if (convId) {
        socket.emit('leave_room', convId)
        socket.emit('mark_read', convId)
      }
    }
  }, [params.userId, socket, scrollToBottom])

  useEffect(() => {
    const onNewMessage = (msg: MessageDto) => {
      if (msg.conversationId !== conversationId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(() => scrollToBottom(), 50)
      if (conversationId) socket.emit('mark_read', conversationId)
    }

    const onMessagesRead = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId !== conversationId) return
      if (data.userId !== user?.id) setSeenByOther(true)
    }

    const onMessageDeleted = (data: {
      messageId: string
      conversationId: string
      deletedAt: string
    }) => {
      if (data.conversationId !== conversationId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, deletedAt: data.deletedAt, body: null, mediaUrl: null }
            : m,
        ),
      )
    }

    const onMessageEdited = (data: {
      messageId: string
      conversationId: string
      body: string
      editedAt: string
    }) => {
      if (data.conversationId !== conversationId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, body: data.body, editedAt: data.editedAt } : m,
        ),
      )
    }

    const onConvPinned = (data: PinnedMessage & { conversationId: string }) => {
      if (data.conversationId !== conversationId) return
      setPinned(data)
      setPinnedDismissed(false)
    }

    const onChatError = (msg: string) => setSendError(msg)

    const onTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId !== conversationId || data.userId === user?.id) return
      setOtherUserTyping(true)
      if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current)
      otherTypingTimerRef.current = setTimeout(() => setOtherUserTyping(false), 4000)
      setTimeout(() => scrollToBottom(), 50)
    }
    const onStoppedTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId !== conversationId || data.userId === user?.id) return
      if (otherTypingTimerRef.current) clearTimeout(otherTypingTimerRef.current)
      setOtherUserTyping(false)
    }

    socket.on('new_message', onNewMessage)
    socket.on('messages_read', onMessagesRead)
    socket.on('message_deleted', onMessageDeleted)
    socket.on('message_edited', onMessageEdited)
    socket.on('conversation_pinned', onConvPinned)
    socket.on('chat_error', onChatError)
    socket.on('typing', onTyping)
    socket.on('stopped_typing', onStoppedTyping)
    return () => {
      socket.off('new_message', onNewMessage)
      socket.off('messages_read', onMessagesRead)
      socket.off('message_deleted', onMessageDeleted)
      socket.off('message_edited', onMessageEdited)
      socket.off('conversation_pinned', onConvPinned)
      socket.off('chat_error', onChatError)
      socket.off('typing', onTyping)
      socket.off('stopped_typing', onStoppedTyping)
    }
  }, [socket, conversationId, scrollToBottom, user?.id])

  const handleSend = useCallback(() => {
    const body = text.trim()
    if (!body || !conversationId) return
    setText('')
    setSendError(null)
    setSeenByOther(false)
    socket.emit('send_message', { conversationId, body })
  }, [text, conversationId, socket])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (imagePreview) {
        void handleSendImage()
      } else {
        handleSend()
      }
    }
  }

  const handleTyping = useCallback(
    (value: string) => {
      setText(value)
      if (!conversationId) return
      if (value && !isTypingRef.current) {
        isTypingRef.current = true
        socket.emit('typing', { conversationId })
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false
          socket.emit('stopped_typing', { conversationId })
        }
      }, 2000)
      if (!value) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        if (isTypingRef.current) {
          isTypingRef.current = false
          socket.emit('stopped_typing', { conversationId })
        }
      }
    },
    [conversationId, socket],
  )

  const handleVoiceTap = async () => {
    if (!conversationId) return
    if (!isPremium) {
      toast.warning('Voice notes are a Premium feature. Upgrade to unlock.')
      return
    }
    if (recording) {
      const blob = await stop()
      if (!blob) return
      setSendingVoice(true)
      try {
        const msg = await chatApi.uploadVoiceNote(conversationId, blob)
        setMessages((prev) => [...prev, msg])
        setTimeout(() => scrollToBottom(), 50)
      } catch {
        // error toast already fires from api layer
      } finally {
        setSendingVoice(false)
      }
    } else {
      const ok = await start()
      if (!ok) {
        /* mic denied */
      }
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const previewUrl = URL.createObjectURL(file)
    setImagePreview({ file, previewUrl })
  }

  const handleSendImage = useCallback(async () => {
    if (!imagePreview || !conversationId) return
    const { file, previewUrl } = imagePreview
    const pendingText = text.trim()
    URL.revokeObjectURL(previewUrl)
    setImagePreview(null)
    setText('')
    setSendingImage(true)
    setSendError(null)
    try {
      const msg = await chatApi.uploadImage(conversationId, file, pendingText || undefined)
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(() => scrollToBottom(), 50)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send image')
    } finally {
      setSendingImage(false)
    }
  }, [imagePreview, text, conversationId, scrollToBottom])

  const fmtDuration = (s: number) => `${s}s`
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  const otherUser = conv?.otherUser
  const grouped = groupByDate(messages)
  const lastMyMsg = [...messages].reverse().find((m) => m.senderId === user?.id)
  const showPinned = pinned && !pinnedDismissed && new Date(pinned.pinnedUntil) > new Date()
  const isMutual = messages.some((m) => m.senderId !== user?.id)

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <button
          onClick={() => router.push('/messages')}
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
          aria-label="Back"
        >
          <BackIcon />
        </button>
        {otherUser ? (
          <button
            onClick={() => setProfileOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity hover:opacity-80"
          >
            {otherUser.photoUrl ? (
              <Image
                src={otherUser.photoUrl}
                alt={otherUser.displayName ?? 'User'}
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="bg-primary/15 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <span className="text-primary text-xs font-semibold">
                  {(otherUser.displayName ?? '?').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-foreground truncate text-sm font-semibold">
                  {otherUser.displayName ?? 'User'}
                </span>
                {otherUser.verified && <VerifiedIcon />}
              </div>
              <div className="flex items-center gap-1.5">
                {otherUser.lastActiveAt ? (
                  (() => {
                    const diffMs = Date.now() - new Date(otherUser.lastActiveAt).getTime()
                    const isNow = diffMs < 5 * 60 * 1000
                    const mins = Math.floor(diffMs / 60000)
                    const label = isNow
                      ? 'Active now'
                      : mins < 60
                        ? `Active ${mins}m ago`
                        : mins < 1440
                          ? `Active ${Math.floor(mins / 60)}h ago`
                          : `Active ${Math.floor(mins / 1440)}d ago`
                    return (
                      <div className="flex items-center gap-1">
                        {isNow && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                        )}
                        <p
                          className={`text-[11px] ${isNow ? 'text-emerald-400' : 'text-muted-foreground'}`}
                        >
                          {label}
                        </p>
                      </div>
                    )
                  })()
                ) : (
                  <p className="text-muted-foreground text-[11px]">Tap to view profile</p>
                )}
                {otherUser.distanceMiles != null && (
                  <>
                    <span className="text-muted-foreground/50 text-[11px]">·</span>
                    <p className="text-muted-foreground text-[11px]">
                      {otherUser.distanceMiles < 0.5
                        ? '< 1 mi away'
                        : `${otherUser.distanceMiles} mi away`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </button>
        ) : (
          <p className="text-foreground flex-1 text-sm font-semibold">Direct message</p>
        )}
        {otherUser && (
          <button
            onClick={() => setShowBlockReport(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors"
            aria-label="More options"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Pinned message banner */}
      {showPinned && <PinnedBanner pinned={pinned} onDismiss={() => setPinnedDismissed(true)} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {grouped.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-xs">Say hello!</p>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.date}>
            <DateSeparator label={group.date} />
            <div className="space-y-1">
              {group.messages.map((msg, idx) => {
                const isMine = msg.senderId === user?.id
                const isLast = msg.id === lastMyMsg?.id
                const nextMsg = group.messages[idx + 1]
                const isLastInRun = !nextMsg || nextMsg.senderId !== msg.senderId
                return (
                  <div
                    key={msg.id}
                    className={[
                      'group flex items-end gap-1.5',
                      isMine ? 'flex-row-reverse' : 'flex-row',
                    ].join(' ')}
                  >
                    {/* Avatar — always first in DOM; flex-row-reverse puts it on the right for sent msgs */}
                    {isMine ? (
                      isLastInRun ? (
                        <div className="bg-primary/20 mb-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                          <span className="text-primary text-[9px] font-bold">
                            {(user?.email ?? 'Y').slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <div className="w-6 shrink-0" />
                      )
                    ) : isLastInRun ? (
                      otherUser?.photoUrl ? (
                        <Image
                          src={otherUser.photoUrl}
                          alt=""
                          width={24}
                          height={24}
                          className="mb-4 h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-primary/15 mb-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                          <span className="text-primary text-[9px] font-semibold">
                            {(otherUser?.displayName ?? '?').slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="w-6 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <MessageBubble
                        msg={msg}
                        isMine={isMine}
                        showSeen={isLast && seenByOther}
                        isPremium={isPremium}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {/* Typing indicator */}
        {otherUserTyping && (
          <div className="mt-1 flex items-end gap-1.5">
            {otherUser?.photoUrl ? (
              <Image
                src={otherUser.photoUrl}
                alt=""
                width={24}
                height={24}
                className="mb-0.5 h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="bg-primary/15 mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                <span className="text-primary text-[9px] font-semibold">
                  {(otherUser?.displayName ?? '?').slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div className="bg-muted flex items-center gap-1 rounded-2xl rounded-bl-sm px-3.5 py-2.5 dark:bg-white/10">
              <span
                className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-border shrink-0 border-t px-4 py-3">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handleImageSelect(e)}
        />
        {/* Image preview — shown before sending */}
        {imagePreview && !recording && (
          <div className="relative mb-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL from
                createObjectURL cannot go through the image optimizer, and the preview is
                revoked as soon as the upload completes. */}
            <img
              src={imagePreview.previewUrl}
              alt="Preview"
              className="border-border h-24 max-w-[180px] rounded-xl border object-cover"
            />
            <button
              onClick={() => {
                URL.revokeObjectURL(imagePreview.previewUrl)
                setImagePreview(null)
              }}
              className="bg-foreground absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full shadow"
            >
              <svg
                viewBox="0 0 14 14"
                className="stroke-background h-2.5 w-2.5 fill-none"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        )}
        {sendError && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive mb-2 rounded-xl border px-3 py-2 text-xs leading-snug">
            {sendError}
          </div>
        )}
        {recording ? (
          <div className="flex items-center gap-3">
            <div className="bg-muted flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-foreground text-sm font-medium">
                Recording… {fmtDuration(duration)}
              </span>
            </div>
            <button
              onClick={cancel}
              className="bg-muted text-destructive hover:bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-2xl transition-colors"
              aria-label="Cancel recording"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => void handleVoiceTap()}
              disabled={sendingVoice}
              className="bg-primary flex h-10 w-10 items-center justify-center rounded-2xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              aria-label="Send voice note"
            >
              <SendIcon />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className="bg-muted dark:bg-white/8 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring flex-1 resize-none rounded-2xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-1"
              style={{ fieldSizing: 'content' }}
            />
            <button
              onClick={() => (isMutual ? imageInputRef.current?.click() : undefined)}
              disabled={sendingImage}
              title={isMutual ? 'Send image' : 'Images can only be sent after they reply'}
              className={[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors',
                isMutual
                  ? 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  : 'bg-muted text-muted-foreground/30 cursor-not-allowed',
              ].join(' ')}
              aria-label="Send image"
            >
              {sendingImage ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              )}
            </button>
            <button
              onClick={() => void handleVoiceTap()}
              className={[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors',
                isPremium
                  ? 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
              ].join(' ')}
              aria-label={isPremium ? 'Record voice note' : 'Voice notes require Premium'}
              title={isPremium ? 'Hold to record' : 'Voice notes require Premium'}
            >
              <MicIcon />
            </button>
            <button
              onClick={imagePreview ? () => void handleSendImage() : handleSend}
              disabled={imagePreview ? sendingImage : !text.trim() && !imagePreview}
              className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              {sendingImage && imagePreview === null ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Profile drawer */}
      {profileOpen && otherUser && (
        <UserProfileDrawer
          userId={otherUser.id}
          displayName={otherUser.displayName}
          onClose={() => setProfileOpen(false)}
          onMessage={() => setProfileOpen(false)}
        />
      )}

      {/* Block / report sheet */}
      {showBlockReport && otherUser && (
        <BlockReportSheet
          userId={otherUser.id}
          displayName={otherUser.displayName ?? 'this user'}
          onClose={() => setShowBlockReport(false)}
          onBlocked={() => router.push('/messages')}
        />
      )}
    </div>
  )
}
