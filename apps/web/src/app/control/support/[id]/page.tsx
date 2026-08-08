'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi } from '@/lib/admin'

type TicketDetail = Awaited<ReturnType<typeof adminApi.getTicket>>

const STATUS_OPTIONS = ['open', 'pending', 'closed']

export default function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (): Promise<void> => {
    try {
      setTicket(await adminApi.getTicket(id))
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function sendReply() {
    if (!reply.trim()) return
    setSending(true)
    setError('')
    try {
      await adminApi.replyToTicket(id, reply.trim())
      setReply('')
      void load()
    } catch {
      setError('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(status: string) {
    try {
      await adminApi.updateTicketStatus(id, status)
      void load()
    } catch {
      /* ignore */
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  if (!ticket) return <p className="text-sm text-white/40">Ticket not found.</p>

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-white/40 hover:text-white">
          ← Back
        </button>
        <h1 className="font-display flex-1 truncate text-xl font-bold text-white">
          {ticket.subject}
        </h1>
      </div>

      {/* Ticket meta */}
      <div className="border-white/8 space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-white/50">
            From: <span className="text-white">{ticket.email}</span>
            {ticket.user && (
              <>
                {' '}
                ·{' '}
                <Link
                  href={`/control/users/${ticket.user.id}`}
                  className="text-purple-400 hover:underline"
                >
                  View account
                </Link>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void changeStatus(s)}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  ticket.status === s
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Original message */}
        <div className="bg-white/3 whitespace-pre-wrap rounded-xl px-4 py-3 text-sm text-white/70">
          {ticket.body}
        </div>

        {/* Replies */}
        {ticket.replies.length > 0 && (
          <div className="space-y-2">
            {ticket.replies.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-purple-500/20 bg-purple-600/10 px-4 py-3"
              >
                <p className="mb-1 text-xs text-purple-400">
                  Admin reply · {new Date(r.createdAt).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap text-sm text-white/80">{r.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply box */}
      <div className="border-white/8 space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Reply</h2>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply… it will be sent to the user via email."
          rows={5}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={() => void sendReply()}
          disabled={!reply.trim() || sending}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
        >
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}
