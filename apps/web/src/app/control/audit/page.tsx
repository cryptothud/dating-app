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
      setLogs(res.logs); setTotal(res.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { void load(0) }, [])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    void load(0)
  }

  function actionColor(action: string) {
    if (action.includes('ban') || action.includes('suspend')) return 'text-red-400'
    if (action.includes('warn')) return 'text-amber-400'
    if (action.includes('verify') || action.includes('unban') || action.includes('unsuspend')) return 'text-green-400'
    if (action.includes('system') || action.includes('maintenance')) return 'text-blue-400'
    return 'text-white/60'
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Audit Log</h1>
        <p className="text-sm text-white/40 mt-0.5">{total.toLocaleString()} total entries — append-only</p>
      </div>

      <form onSubmit={handleFilter} className="flex gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action (e.g. user.ban)…"
          className="flex-1 rounded-xl bg-[#0d0a16] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
        />
        <button type="submit" className="rounded-xl bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 transition-colors">Filter</button>
      </form>

      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No entries</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {['Action', 'Target', 'Details', 'Time'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-white/40 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono ${actionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {log.targetUser ? (
                      <Link href={`/control/users/${log.targetUserId}`} className="text-xs text-purple-400 hover:underline">
                        {log.targetUser.email}
                      </Link>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    {log.details ? (
                      <span className="text-xs text-white/30 font-mono truncate block">
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${String(v)}`).join(', ')}
                      </span>
                    ) : <span className="text-white/20 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-white/30 whitespace-nowrap">
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
          <span className="text-sm text-white/40">{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => { const o = Math.max(0, offset - limit); setOffset(o); void load(o) }} disabled={offset === 0} className="rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white/60 disabled:opacity-30 hover:bg-white/10 transition-colors">← Prev</button>
            <button onClick={() => { const o = offset + limit; setOffset(o); void load(o) }} disabled={offset + limit >= total} className="rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white/60 disabled:opacity-30 hover:bg-white/10 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
