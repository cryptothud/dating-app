'use client'

import { useEffect, useState } from 'react'
import { adminApi, type FeatureFlag } from '@/lib/admin'

type ElevatedUser = {
  id: string
  email: string
  role: string
  profile: { displayName: string | null } | null
}

export default function SystemPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [cachePattern, setCachePattern] = useState('')
  const [status, setStatus] = useState('')
  const [roleEmail, setRoleEmail] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleStatus, setRoleStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [elevatedUsers, setElevatedUsers] = useState<ElevatedUser[]>([])
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function load() {
    try {
      const [sys, elevated] = await Promise.all([adminApi.getSystem(), adminApi.getElevatedUsers()])
      setMaintenanceMode(sys.maintenanceMode)
      setFlags(sys.flags)
      setElevatedUsers(elevated)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function toggleMaintenance() {
    setToggleLoading(true)
    try {
      await adminApi.setMaintenance(!maintenanceMode)
      setMaintenanceMode(!maintenanceMode)
      setStatus(maintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode ENABLED')
    } catch {
      setStatus('Failed to toggle maintenance mode')
    } finally {
      setToggleLoading(false)
    }
  }

  async function toggleFlag(key: string, current: boolean) {
    try {
      await adminApi.updateFlag(key, !current)
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !current } : f)))
    } catch {
      /* ignore */
    }
  }

  async function flushCache() {
    if (!cachePattern) return
    try {
      await adminApi.flushCache(cachePattern)
      setStatus(`Cache flush queued for pattern: ${cachePattern}`)
      setCachePattern('')
    } catch {
      setStatus('Cache flush failed')
    }
  }

  async function handleRoleChange(newRole: 'moderator' | 'user') {
    const email = roleEmail.trim().toLowerCase()
    if (!email) return
    setRoleLoading(true)
    setRoleStatus(null)
    try {
      const res = await adminApi.searchUsers(email, 1, 0)
      const match = res.users.find((u) => u.email.toLowerCase() === email)
      if (!match) {
        setRoleStatus({ ok: false, msg: `No user found with email: ${email}` })
        return
      }
      if (match.role === newRole) {
        setRoleStatus({ ok: false, msg: `${email} already has the ${newRole} role` })
        return
      }
      await adminApi.setRole(match.id, newRole)
      const action = newRole === 'moderator' ? 'granted Moderator' : 'revoked to User'
      setRoleStatus({ ok: true, msg: `${email} has been ${action}` })
      setRoleEmail('')
      setElevatedUsers(await adminApi.getElevatedUsers())
    } catch {
      setRoleStatus({ ok: false, msg: 'Failed to update role — try again' })
    } finally {
      setRoleLoading(false)
    }
  }

  async function handleRevoke(user: ElevatedUser) {
    setRevokingId(user.id)
    try {
      await adminApi.setRole(user.id, 'user')
      setElevatedUsers(await adminApi.getElevatedUsers())
    } catch {
      /* ignore */
    } finally {
      setRevokingId(null)
    }
  }

  async function broadcast() {
    if (!broadcastTitle || !broadcastBody) return
    try {
      await adminApi.broadcastPush(broadcastTitle, broadcastBody)
      setStatus('Push notification broadcast queued')
      setBroadcastTitle('')
      setBroadcastBody('')
    } catch {
      setStatus('Broadcast failed')
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="font-display text-xl font-bold text-white">System Controls</h1>

      {status && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-600/10 px-4 py-2.5 text-sm text-purple-300">
          {status}
        </div>
      )}

      {/* Maintenance Mode */}
      <div className="border-white/8 space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Maintenance Mode</h2>
        <p className="text-xs text-white/40">
          When enabled, all non-admin routes return 503. Admin panel stays accessible.
        </p>
        <div className="flex items-center gap-3">
          <div
            className={`h-6 w-12 cursor-pointer rounded-full transition-colors ${maintenanceMode ? 'bg-red-500' : 'bg-white/10'}`}
            onClick={() => !toggleLoading && void toggleMaintenance()}
          >
            <div
              className={`m-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${maintenanceMode ? 'translate-x-6' : ''}`}
            />
          </div>
          <span
            className={`text-sm font-medium ${maintenanceMode ? 'text-red-400' : 'text-white/40'}`}
          >
            {maintenanceMode ? 'MAINTENANCE MODE ON' : 'Off'}
          </span>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="border-white/8 space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Feature Flags</h2>
        {flags.length === 0 ? (
          <p className="text-xs text-white/30">No feature flags configured yet.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-white">{f.key}</p>
                  {f.description && <p className="text-xs text-white/30">{f.description}</p>}
                </div>
                <div
                  className={`h-5 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors ${f.enabled ? 'bg-purple-500' : 'bg-white/10'}`}
                  onClick={() => void toggleFlag(f.key, f.enabled)}
                >
                  <div
                    className={`m-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${f.enabled ? 'translate-x-5' : ''}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cache Flush */}
      <div className="border-white/8 space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Flush Cache</h2>
        <p className="text-xs text-white/40">
          Enter a key pattern to clear from Redis (e.g.{' '}
          <code className="text-purple-400">email:msg_waiting:*</code>).
        </p>
        <div className="flex gap-2">
          <input
            value={cachePattern}
            onChange={(e) => setCachePattern(e.target.value)}
            placeholder="Key pattern…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
          />
          <button
            onClick={() => void flushCache()}
            disabled={!cachePattern}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
          >
            Flush
          </button>
        </div>
      </div>

      {/* Role Management */}
      <div className="border-white/8 space-y-4 rounded-2xl border bg-[#0d0a16] p-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Role Management</h2>
          <p className="mt-0.5 text-xs text-white/40">
            Grant or revoke the Moderator role by email address.
          </p>
        </div>

        {/* Current admins & mods */}
        {elevatedUsers.length > 0 && (
          <div className="space-y-1.5">
            {elevatedUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white/4 border-white/6 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  {u.profile?.displayName && (
                    <p className="truncate text-sm font-medium text-white">
                      {u.profile.displayName}
                    </p>
                  )}
                  <p className="truncate text-xs text-white/50">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}
                  >
                    {u.role}
                  </span>
                  {u.role === 'moderator' && (
                    <button
                      onClick={() => void handleRevoke(u)}
                      disabled={revokingId === u.id}
                      className="text-xs text-red-400/70 transition-colors hover:text-red-400 disabled:opacity-40"
                    >
                      {revokingId === u.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {roleStatus && (
          <div
            className={`rounded-xl px-3.5 py-2.5 text-xs font-medium ${roleStatus.ok ? 'border border-emerald-500/20 bg-emerald-600/10 text-emerald-400' : 'border border-red-500/20 bg-red-600/10 text-red-400'}`}
          >
            {roleStatus.msg}
          </div>
        )}

        <input
          value={roleEmail}
          onChange={(e) => {
            setRoleEmail(e.target.value)
            setRoleStatus(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleRoleChange('moderator')
          }}
          placeholder="user@example.com"
          type="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
        />

        <div className="flex gap-2">
          <button
            onClick={() => void handleRoleChange('moderator')}
            disabled={!roleEmail.trim() || roleLoading}
            className="flex-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
          >
            {roleLoading ? 'Updating…' : 'Grant Moderator'}
          </button>
          <button
            onClick={() => void handleRoleChange('user')}
            disabled={!roleEmail.trim() || roleLoading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            Revoke
          </button>
        </div>
      </div>

      {/* Broadcast Push */}
      <div className="border-white/8 space-y-3 rounded-2xl border bg-[#0d0a16] p-5">
        <h2 className="text-sm font-semibold text-white">Broadcast Push Notification</h2>
        <p className="text-xs text-white/40">Send a push notification to all subscribed users.</p>
        <input
          value={broadcastTitle}
          onChange={(e) => setBroadcastTitle(e.target.value)}
          placeholder="Title…"
          maxLength={60}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
        />
        <textarea
          value={broadcastBody}
          onChange={(e) => setBroadcastBody(e.target.value)}
          placeholder="Message…"
          maxLength={200}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
        />
        <button
          onClick={() => void broadcast()}
          disabled={!broadcastTitle || !broadcastBody}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
        >
          Send Broadcast
        </button>
      </div>
    </div>
  )
}
