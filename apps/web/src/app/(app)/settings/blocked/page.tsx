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
    api
      .get<BlockedUser[]>('/users/blocked')
      .then(setUsers)
      .catch(() => {
        /* noop */
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleUnblock(id: string): Promise<void> {
    setUnblocking(id)
    try {
      await api.del(`/users/${id}/block`)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch {
      /* noop */
    } finally {
      setUnblocking(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 4L6 8l4 4" />
            </svg>
          </Link>
          <h1 className="font-display text-foreground text-xl font-bold">Blocked Users</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <svg
                viewBox="0 0 24 24"
                className="text-muted-foreground h-6 w-6 fill-none stroke-current"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M4.93 4.93l14.14 14.14" />
              </svg>
            </div>
            <p className="text-foreground text-sm font-medium">No blocked users</p>
            <p className="text-muted-foreground text-xs">
              People you block won't appear on the map or be able to message you.
            </p>
          </div>
        ) : (
          <div className="bg-card border-border divide-border divide-y rounded-2xl border">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
                    {(user.displayName ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <p className="text-foreground text-sm font-medium">
                    {user.displayName ?? 'Anonymous'}
                  </p>
                </div>
                <button
                  onClick={() => void handleUnblock(user.id)}
                  disabled={unblocking === user.id}
                  className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                >
                  {unblocking === user.id ? 'Unblocking…' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-muted-foreground px-4 text-center text-xs">
          Unblocking someone lets them see your profile and message you again.
        </p>
      </div>
    </div>
  )
}
