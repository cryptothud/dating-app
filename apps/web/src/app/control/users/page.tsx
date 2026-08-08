'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminApi, type AdminUser } from '@/lib/admin'

function StatusBadge({ user }: { user: AdminUser }) {
  if (user.banned)
    return (
      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">Banned</span>
    )
  if (user.suspended)
    return (
      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
        Suspended
      </span>
    )
  if (user.role === 'admin')
    return (
      <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
        Admin
      </span>
    )
  return (
    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Active</span>
  )
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
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial page only. Searching is driven by the form below, not by keystrokes.
  useEffect(() => {
    void search('', 0)
  }, [search])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    void search(query, 0)
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-white">Users</h1>
        <p className="mt-0.5 text-sm text-white/40">{total.toLocaleString()} total users</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, phone, or ID…"
          className="flex-1 rounded-xl border border-white/10 bg-[#0d0a16] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          Search
        </button>
      </form>

      <div className="border-white/8 overflow-hidden rounded-2xl border bg-[#0d0a16]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">No users found</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-white/8 border-b">
                {['User', 'Status', 'Reports', 'Joined', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-white/3 border-b border-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">
                      {u.profile?.displayName ?? 'No profile'}
                    </p>
                    <p className="text-xs text-white/40">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge user={u} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${u._count.reportsReceived > 0 ? 'text-red-400' : 'text-white/40'}`}
                    >
                      {u._count.reportsReceived}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/control/users/${u.id}`}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
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
          <span className="text-sm text-white/40">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setOffset(Math.max(0, offset - limit))
                void search(query, Math.max(0, offset - limit))
              }}
              disabled={offset === 0}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => {
                setOffset(offset + limit)
                void search(query, offset + limit)
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
