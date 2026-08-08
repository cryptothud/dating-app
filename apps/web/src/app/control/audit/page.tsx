'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi, type AuditEntry } from '@/lib/admin'

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const limit = 50

  async function load(off: number) {
    setLoading(true)
    try {
      const res = await adminApi.getAuditLog({ limit, offset: off, action: filter || undefined })
      setLogs(res.logs)
      setTotal(res.total)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(0)
  }, [])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    void load(0)
  }

  function actionColor(action: string) {
    if (action.includes('ban') || action.includes('suspend')) return 'text-red-400'
    if (action.includes('warn')) return 'text-amber-400'
    if (action.includes('verify') || action.includes('unban') || action.includes('unsuspend'))
      return 'text-green-400'
    if (action.includes('system') || action.includes('maintenance')) return 'text-blue-400'
    return 'text-white/60'
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-white">Audit Log</h1>
        <p className="mt-0.5 text-sm text-white/40">
          {total.toLocaleString()} total entries — append-only
        </p>
      </div>

      <form onSubmit={handleFilter} className="flex gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action (e.g. user.ban)…"
          className="flex-1 rounded-xl border border-white/10 bg-[#0d0a16] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          Filter
        </button>
      </form>

      <div className="border-white/8 overflow-hidden rounded-2xl border bg-[#0d0a16]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">No entries</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-white/8 border-b">
                {['Action', 'Target', 'Details', 'Time'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-white/3 border-b border-white/5 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-xs ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {log.targetUser ? (
                      <Link
                        href={`/control/users/${log.targetUserId}`}
                        className="text-xs text-purple-400 hover:underline"
                      >
                        {log.targetUser.email}
                      </Link>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="max-w-[200px] px-4 py-2.5">
                    {log.details ? (
                      <span className="block truncate font-mono text-xs text-white/30">
                        {Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-white/30">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const o = Math.max(0, offset - limit)
                setOffset(o)
                void load(o)
              }}
              disabled={offset === 0}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => {
                const o = offset + limit
                setOffset(o)
                void load(o)
              }}
              disabled={offset + limit >= total}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
