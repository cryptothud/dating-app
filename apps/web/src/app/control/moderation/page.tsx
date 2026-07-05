'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi, type AdminReport } from '@/lib/admin'

const STATUSES = ['open', 'reviewed', 'resolved', 'escalated', 'all']

export default function ModerationPage() {
  const [status, setStatus] = useState('open')
  const [reports, setReports] = useState<AdminReport[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  async function load(s: string) {
    setLoading(true)
    try {
      const res = await adminApi.getReports(s)
      setReports(res.reports); setTotal(res.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { void load(status) }, [status])

  async function resolve(id: string) {
    setResolving(id)
    try {
      await adminApi.resolveReport(id, 'Reviewed by admin')
      void load(status)
    } catch { /* ignore */ }
    finally { setResolving(null) }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Moderation</h1>
        <p className="text-sm text-white/40 mt-0.5">{total} reports</p>
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
        ) : reports.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No {status} reports</p>
        ) : (
          <div className="divide-y divide-white/5">
            {reports.map((r) => (
              <div key={r.id} className="px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{r.reason.replace('_', ' ')}</span>
                      <span className="text-xs text-white/30">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      Reporter: <Link href={`/control/users/${r.reporter.id}`} className="text-purple-400 hover:underline">{r.reporter.profile?.displayName ?? r.reporter.email}</Link>
                      {' → '}
                      Reported: <Link href={`/control/users/${r.reported.id}`} className="text-purple-400 hover:underline">{r.reported.profile?.displayName ?? r.reported.email}</Link>
                      {r.reported.banned && <span className="ml-1 text-red-400">[banned]</span>}
                      {r.reported.suspended && <span className="ml-1 text-amber-400">[suspended]</span>}
                    </p>
                    {r.details && <p className="text-xs text-white/30 mt-1 line-clamp-2">{r.details}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/control/users/${r.reported.id}`} className="rounded-lg px-3 py-1.5 text-xs bg-white/5 text-white/50 hover:bg-white/10 transition-colors">
                      View user
                    </Link>
                    {r.status === 'open' && (
                      <button
                        onClick={() => void resolve(r.id)}
                        disabled={resolving === r.id}
                        className="rounded-lg px-3 py-1.5 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-40 transition-colors"
                      >
                        {resolving === r.id ? '…' : 'Resolve'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
