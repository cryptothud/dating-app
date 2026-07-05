'use client'

import { useEffect, useState } from 'react'
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

  async function load() {
    try { setTicket(await adminApi.getTicket(id)) } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [id])

  async function sendReply() {
    if (!reply.trim()) return
    setSending(true); setError('')
    try {
      await adminApi.replyToTicket(id, reply.trim())
      setReply('')
      void load()
    } catch { setError('Failed to send reply') }
    finally { setSending(false) }
  }

  async function changeStatus(status: string) {
    try {
      await adminApi.updateTicketStatus(id, status)
      void load()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /></div>
  if (!ticket) return <p className="text-white/40 text-sm">Ticket not found.</p>

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white text-sm">← Back</button>
        <h1 className="text-xl font-display font-bold text-white truncate flex-1">{ticket.subject}</h1>
      </div>

      {/* Ticket meta */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-white/50">
            From: <span className="text-white">{ticket.email}</span>
            {ticket.user && (
              <> · <Link href={`/control/users/${ticket.user.id}`} className="text-purple-400 hover:underline">View account</Link></>
            )}
          </div>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void changeStatus(s)}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  ticket.status === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Original message */}
        <div className="rounded-xl bg-white/3 px-4 py-3 text-sm text-white/70 whitespace-pre-wrap">{ticket.body}</div>

        {/* Replies */}
        {ticket.replies.length > 0 && (
          <div className="space-y-2">
            {ticket.replies.map((r) => (
              <div key={r.id} className="rounded-xl bg-purple-600/10 border border-purple-500/20 px-4 py-3">
                <p className="text-xs text-purple-400 mb-1">Admin reply · {new Date(r.createdAt).toLocaleString()}</p>
                <p className="text-sm text-white/80 whitespace-pre-wrap">{r.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply box */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Reply</h2>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply… it will be sent to the user via email."
          rows={5}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-purple-500/50"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={() => void sendReply()}
          disabled={!reply.trim() || sending}
          className="rounded-xl bg-purple-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-purple-700 disabled:opacity-40 transition-colors"
        >
          {sending ? 'Sending…' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}
