'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminApi, type AdminUser } from '@/lib/admin'

function StatusBadge({ user }: { user: AdminUser }) {
  if (user.banned) return <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Banned</span>
  if (user.suspended) return <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Suspended</span>
  if (user.role === 'admin') return <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Admin</span>
  return <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
}

export default function UsersPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const limit = 20

  const search = useCallback(async (q: string, off: number) => {
    setLoading(true)
    try {
      const res = await adminApi.searchUsers(q, limit, off)
      setUsers(res.users)
      setTotal(res.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void search(query, 0) }, [search])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    void search(query, 0)
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Users</h1>
        <p className="text-sm text-white/40 mt-0.5">{total.toLocaleString()} total users</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, phone, or ID…"
          className="flex-1 rounded-xl bg-[#0d0a16] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
        />
        <button type="submit" className="rounded-xl bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 transition-colors">
          Search
        </button>
      </form>

      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /></div>
        ) : users.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No users found</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {['User', 'Status', 'Reports', 'Joined', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-white/40 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">{u.profile?.displayName ?? 'No profile'}</p>
                    <p className="text-xs text-white/40">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge user={u} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${u._count.reportsReceived > 0 ? 'text-red-400' : 'text-white/40'}`}>
                      {u._count.reportsReceived}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/control/users/${u.id}`} className="text-xs text-purple-400 hover:text-purple-300">
                      View →
                    </Link>
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
            <button
              onClick={() => { setOffset(Math.max(0, offset - limit)); void search(query, Math.max(0, offset - limit)) }}
              disabled={offset === 0}
              className="rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white/60 disabled:opacity-30 hover:bg-white/10 transition-colors"
            >← Prev</button>
            <button
              onClick={() => { setOffset(offset + limit); void search(query, offset + limit) }}
              disabled={offset + limit >= total}
              className="rounded-lg px-3 py-1.5 text-sm bg-white/5 text-white/60 disabled:opacity-30 hover:bg-white/10 transition-colors"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
