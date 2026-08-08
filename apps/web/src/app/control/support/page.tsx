'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi, type SupportTicket } from '@/lib/admin'

const STATUSES = ['open', 'pending', 'closed', 'all']

export default function SupportPage() {
  const [status, setStatus] = useState('open')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  async function load(s: string) {
    setLoading(true)
    try {
      const res = await adminApi.getTickets(s)
      setTickets(res.tickets)
      setTotal(res.total)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(status)
  }, [status])

  function statusColor(s: string) {
    if (s === 'open') return 'text-amber-400 bg-amber-500/10'
    if (s === 'pending') return 'text-blue-400 bg-blue-500/10'
    if (s === 'closed') return 'text-white/30 bg-white/5'
    return 'text-white/40 bg-white/5'
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-white">Support Inbox</h1>
        <p className="mt-0.5 text-sm text-white/40">{total} tickets</p>
      </div>

      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              status === s
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="border-white/8 overflow-hidden rounded-2xl border bg-[#0d0a16]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">No {status} tickets</p>
        ) : (
          <div className="divide-y divide-white/5">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="hover:bg-white/3 flex items-center gap-4 px-5 py-4 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {t.email} · {new Date(t.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColor(t.status)}`}
                  >
                    {t.status}
                  </span>
                  {t._count.replies > 0 && (
                    <span className="text-xs text-white/30">{t._count.replies} replies</span>
                  )}
                  <Link
                    href={`/control/support/${t.id}`}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
