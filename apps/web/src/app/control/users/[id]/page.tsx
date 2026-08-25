'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin'

type UserDetail = Awaited<ReturnType<typeof adminApi.getUser>>

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState<string | null>(null)

  useEffect(() => {
    adminApi
      .getUser(id)
      .then(setUser)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [id])

  async function action(fn: () => Promise<unknown>, label: string) {
    setActionLoading(true)
    setError('')
    try {
      await fn()
      setUser(await adminApi.getUser(id))
      setShowReason(null)
      setReason('')
    } catch {
      setError(`${label} failed`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  if (!user) return <p className="text-sm text-white/40">User not found.</p>

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-white/40 hover:text-white">
          ← Back
        </button>
        <h1 className="font-display text-xl font-bold text-white">
          {user.profile?.displayName ?? user.email}
        </h1>
      </div>

      {/* Account info */}
      <div className="border-white/[0.08] space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Account</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['ID', user.id],
            ['Email', user.email],
            ['Role', user.role],
            ['Verified', user.verified ? 'Yes' : 'No'],
            ['Suspended', user.suspended ? 'Yes' : 'No'],
            ['Banned', user.banned ? `Yes — ${user.banReason ?? ''}` : 'No'],
            ['Joined', new Date(user.createdAt).toLocaleDateString()],
            ['Last active', new Date(user.lastActive).toLocaleString()],
            ...(user.timeoutUntil && new Date(user.timeoutUntil) > new Date()
              ? [
                  ['Timed out until', new Date(user.timeoutUntil).toLocaleString()] as [
                    string,
                    string,
                  ],
                ]
              : []),
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-white/40">{label}</p>
              <p className="text-white/80">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="border-white/[0.08] space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Actions</h2>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {showReason && (
          <div className="flex gap-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Reason for ${showReason}…`}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
            />
            <button
              disabled={!reason || actionLoading}
              onClick={() => {
                if (showReason === 'warn') void action(() => adminApi.warn(id, reason), 'Warn')
                if (showReason === 'suspend')
                  void action(() => adminApi.suspend(id, reason), 'Suspend')
                if (showReason === 'ban') void action(() => adminApi.ban(id, reason), 'Ban')
              }}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setShowReason(null)
                setReason('')
              }}
              className="px-2 text-sm text-white/40 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowReason('warn')}
            className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            Warn
          </button>
          {user.suspended ? (
            <button
              onClick={() => void action(() => adminApi.unsuspend(id), 'Unsuspend')}
              disabled={actionLoading}
              className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-40"
            >
              Unsuspend
            </button>
          ) : (
            <button
              onClick={() => setShowReason('suspend')}
              className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs text-orange-400 transition-colors hover:bg-orange-500/20"
            >
              Suspend
            </button>
          )}
          {user.banned ? (
            <button
              onClick={() => void action(() => adminApi.unban(id), 'Unban')}
              disabled={actionLoading}
              className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-40"
            >
              Unban
            </button>
          ) : (
            <button
              onClick={() => setShowReason('ban')}
              className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"
            >
              Ban
            </button>
          )}
          {!user.verified && (
            <button
              onClick={() => void action(() => adminApi.verify(id), 'Verify')}
              disabled={actionLoading}
              className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-40"
            >
              Verify
            </button>
          )}
          {user.timeoutUntil && new Date(user.timeoutUntil) > new Date() && (
            <button
              onClick={() => void action(() => adminApi.clearTimeout(id), 'Remove timeout')}
              disabled={actionLoading}
              className="rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs text-sky-400 transition-colors hover:bg-sky-500/20 disabled:opacity-40"
            >
              Remove Timeout
            </button>
          )}
          <button
            onClick={() => void action(() => adminApi.forceLogout(id), 'Force logout')}
            disabled={actionLoading}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Force Logout
          </button>
        </div>
      </div>

      {/* Reports received */}
      <div className="border-white/[0.08] space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">
          Reports received ({user.reportsReceived?.length ?? 0})
        </h2>
        {(user.reportsReceived ?? []).length === 0 ? (
          <p className="text-xs text-white/30">No reports</p>
        ) : (
          <div className="space-y-2">
            {(user.reportsReceived ?? []).map((r) => (
              <div key={r.id} className="bg-white/[0.03] rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-white/70">{r.reason}</span>
                <span className="ml-2 text-xs text-white/30">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
                {r.details && <p className="mt-0.5 text-xs text-white/40">{r.details}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit history */}
      <div className="border-white/[0.08] space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Admin action history</h2>
        {(user.auditLogsTargeted ?? []).length === 0 ? (
          <p className="text-xs text-white/30">No admin actions recorded</p>
        ) : (
          <div className="space-y-1">
            {(user.auditLogsTargeted ?? []).map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-1 text-xs text-white/50">
                <span className="font-mono text-purple-400">{log.action}</span>
                <span className="text-white/30">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
