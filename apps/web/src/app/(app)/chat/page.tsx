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
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
      <span className="text-[11px] font-bold text-primary">{initials}</span>
    </div>
  )
}

function DateSeparator({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
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
    chatApi.getGlobalMessages()
      .then(({ messages: msgs }) => {
        setMessages(msgs)
        setLoading(false)
        setTimeout(() => scrollToBottom('instant'), 50)
      })
      .catch(() => setLoading(false))

    socket.emit('join_global')
    return () => { socket.emit('leave_global') }
  }, [socket, scrollToBottom])

  useEffect(() => {
    const onGlobal = (msg: GlobalMessage) => {
      setMessages((prev) => [...prev, msg])
      setTimeout(() => scrollToBottom(), 50)
    }
    socket.on('global_message', onGlobal)
    return () => { socket.off('global_message', onGlobal) }
  }, [socket, scrollToBottom])

  const handleSend = useCallback(() => {
    const body = text.trim()
    if (!body) return
    setText('')
    socket.emit('send_global_message', body)
  }, [text, socket])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend() }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const grouped = groupByDate(messages)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <h1 className="text-lg font-bold font-display text-foreground">City Chat</h1>
        </div>
        <span className="text-xs text-muted-foreground">
          {messages.length > 0 ? `${messages.length} messages` : 'Be the first to say hello'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {grouped.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">City Chat is empty</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAuthenticated ? 'Say hello and start the conversation!' : 'Sign up to start chatting with people nearby.'}
              </p>
            </div>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            <DateSeparator label={group.date} />
            <div className="space-y-4">
              {group.messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 min-w-0">
                  <Avatar msg={msg} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                        {msg.displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatMessageTime(msg.sentAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed break-words mt-0.5">
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
        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something to the city…"
            maxLength={500}
            className="flex-1 h-11 px-4 rounded-2xl bg-muted dark:bg-white/8 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity"
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
      ) : (
        <div className="shrink-0 border-t border-border px-4 py-4">
          <button
            onClick={() => router.push('/signup')}
            className="w-full h-11 rounded-2xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Sign up to chat
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2">
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
