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
      setReports(res.reports)
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

  async function resolve(id: string) {
    setResolving(id)
    try {
      await adminApi.resolveReport(id, 'Reviewed by admin')
      void load(status)
    } catch {
      /* ignore */
    } finally {
      setResolving(null)
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-white">Moderation</h1>
        <p className="mt-0.5 text-sm text-white/40">{total} reports</p>
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

      <div className="border-white/[0.08] overflow-hidden rounded-2xl border bg-[#0d0a16]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">No {status} reports</p>
        ) : (
          <div className="divide-y divide-white/5">
            {reports.map((r) => (
              <div key={r.id} className="space-y-2 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {r.reason.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-white/30">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">
                      Reporter:{' '}
                      <Link
                        href={`/control/users/${r.reporter.id}`}
                        className="text-purple-400 hover:underline"
                      >
                        {r.reporter.profile?.displayName ?? r.reporter.email}
                      </Link>
                      {' → '}
                      Reported:{' '}
                      <Link
                        href={`/control/users/${r.reported.id}`}
                        className="text-purple-400 hover:underline"
                      >
                        {r.reported.profile?.displayName ?? r.reported.email}
                      </Link>
                      {r.reported.banned && <span className="ml-1 text-red-400">[banned]</span>}
                      {r.reported.suspended && (
                        <span className="ml-1 text-amber-400">[suspended]</span>
                      )}
                    </p>
                    {r.details && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/30">{r.details}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Link
                      href={`/control/users/${r.reported.id}`}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10"
                    >
                      View user
                    </Link>
                    {r.status === 'open' && (
                      <button
                        onClick={() => void resolve(r.id)}
                        disabled={resolving === r.id}
                        className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-40"
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
