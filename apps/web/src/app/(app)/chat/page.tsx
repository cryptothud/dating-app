'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { chatApi, formatMessageTime, formatMessageDate } from '@/lib/chat'
import { useSocket } from '@/hooks/use-socket'
import { useAuth } from '@/hooks/use-auth'
import type { GlobalMessage } from '@dating-app/types'

function Avatar({ msg }: { msg: GlobalMessage }): React.JSX.Element {
  const initials = msg.displayName.slice(0, 2).toUpperCase()
  if (msg.photoUrl) {
    return (
      <img
        src={msg.photoUrl}
        alt={msg.displayName}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="bg-primary/15 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
      <span className="text-primary text-[11px] font-bold">{initials}</span>
    </div>
  )
}

function DateSeparator({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
      <div className="bg-border h-px flex-1" />
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

export default function CityChatPage(): React.JSX.Element {
  const router = useRouter()
  const socket = useSocket()
  const { isAuthenticated } = useAuth()

  const [messages, setMessages] = useState<GlobalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    chatApi
      .getGlobalMessages()
      .then(({ messages: msgs }) => {
        setMessages(msgs)
        setLoading(false)
        setTimeout(() => scrollToBottom('instant'), 50)
      })
      .catch(() => setLoading(false))

    socket.emit('join_global')
    return () => {
      socket.emit('leave_global')
    }
  }, [socket, scrollToBottom])

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

  const handleSend = useCallback(() => {
    const body = text.trim()
    if (!body) return
    setText('')
    socket.emit('send_global_message', body)
  }, [text, socket])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h1 className="font-display text-foreground text-lg font-bold">City Chat</h1>
        </div>
        <span className="text-muted-foreground text-xs">
          {messages.length > 0 ? `${messages.length} messages` : 'Be the first to say hello'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {grouped.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
              <svg
                viewBox="0 0 24 24"
                className="stroke-primary h-7 w-7 fill-none"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold">City Chat is empty</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {isAuthenticated
                  ? 'Say hello and start the conversation!'
                  : 'Sign up to start chatting with people nearby.'}
              </p>
            </div>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            <DateSeparator label={group.date} />
            <div className="space-y-4">
              {group.messages.map((msg) => (
                <div key={msg.id} className="flex min-w-0 items-start gap-3">
                  <Avatar msg={msg} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-foreground max-w-[150px] truncate text-xs font-semibold">
                        {msg.displayName}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[10px]">
                        {formatMessageTime(msg.sentAt)}
                      </span>
                    </div>
                    <p className="text-foreground/90 mt-0.5 break-words text-sm leading-relaxed">
                      {msg.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input or CTA */}
      {isAuthenticated ? (
        <div className="border-border flex shrink-0 items-center gap-2 border-t px-4 py-3">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something to the city…"
            maxLength={500}
            className="bg-muted dark:bg-white/8 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 flex-1 rounded-2xl border px-4 text-sm focus:outline-none focus:ring-1"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="bg-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
      ) : (
        <div className="border-border shrink-0 border-t px-4 py-4">
          <button
            onClick={() => router.push('/signup')}
            className="bg-primary h-11 w-full rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Sign up to chat
          </button>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Already have an account?{' '}
            <button onClick={() => router.push('/')} className="text-primary hover:underline">
              Sign in
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
