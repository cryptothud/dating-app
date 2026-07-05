'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface BlockedUser {
  id: string
  displayName: string | null
}

export default function BlockedUsersPage(): React.JSX.Element {
  const [users, setUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    api.get<BlockedUser[]>('/users/blocked')
      .then(setUsers)
      .catch(() => { /* noop */ })
      .finally(() => setLoading(false))
  }, [])

  async function handleUnblock(id: string): Promise<void> {
    setUnblocking(id)
    try {
      await api.del(`/users/${id}/block`)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch { /* noop */ } finally {
      setUnblocking(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4L6 8l4 4" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold font-display text-foreground">Blocked Users</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-muted-foreground fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M4.93 4.93l14.14 14.14" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No blocked users</p>
            <p className="text-xs text-muted-foreground">People you block won't appear on the map or be able to message you.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-semibold">
                    {(user.displayName ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {user.displayName ?? 'Anonymous'}
                  </p>
                </div>
                <button
                  onClick={() => void handleUnblock(user.id)}
                  disabled={unblocking === user.id}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 transition-colors"
                >
                  {unblocking === user.id ? 'Unblocking…' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center px-4">
          Unblocking someone lets them see your profile and message you again.
        </p>
      </div>
    </div>
  )
}
