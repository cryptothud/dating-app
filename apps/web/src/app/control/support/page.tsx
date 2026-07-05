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
      setTickets(res.tickets); setTotal(res.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { void load(status) }, [status])

  function statusColor(s: string) {
    if (s === 'open') return 'text-amber-400 bg-amber-500/10'
    if (s === 'pending') return 'text-blue-400 bg-blue-500/10'
    if (s === 'closed') return 'text-white/30 bg-white/5'
    return 'text-white/40 bg-white/5'
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Support Inbox</h1>
        <p className="text-sm text-white/40 mt-0.5">{total} tickets</p>
      </div>

      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize',
              status === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No {status} tickets</p>
        ) : (
          <div className="divide-y divide-white/5">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.subject}</p>
                  <p className="text-xs text-white/40 mt-0.5">{t.email} · {new Date(t.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(t.status)}`}>{t.status}</span>
                  {t._count.replies > 0 && (
                    <span className="text-xs text-white/30">{t._count.replies} replies</span>
                  )}
                  <Link href={`/control/support/${t.id}`} className="text-xs text-purple-400 hover:text-purple-300">
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
