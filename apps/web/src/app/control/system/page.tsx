'use client'

import { useEffect, useState } from 'react'
import { adminApi, type FeatureFlag } from '@/lib/admin'

type ElevatedUser = { id: string; email: string; role: string; profile: { displayName: string | null } | null }

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
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function toggleMaintenance() {
    setToggleLoading(true)
    try {
      await adminApi.setMaintenance(!maintenanceMode)
      setMaintenanceMode(!maintenanceMode)
      setStatus(maintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode ENABLED')
    } catch { setStatus('Failed to toggle maintenance mode') }
    finally { setToggleLoading(false) }
  }

  async function toggleFlag(key: string, current: boolean) {
    try {
      await adminApi.updateFlag(key, !current)
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !current } : f))
    } catch { /* ignore */ }
  }

  async function flushCache() {
    if (!cachePattern) return
    try {
      await adminApi.flushCache(cachePattern)
      setStatus(`Cache flush queued for pattern: ${cachePattern}`)
      setCachePattern('')
    } catch { setStatus('Cache flush failed') }
  }

  async function handleRoleChange(newRole: 'moderator' | 'user') {
    const email = roleEmail.trim().toLowerCase()
    if (!email) return
    setRoleLoading(true)
    setRoleStatus(null)
    try {
      const res = await adminApi.searchUsers(email, 1, 0)
      const match = res.users.find((u) => u.email.toLowerCase() === email)
      if (!match) { setRoleStatus({ ok: false, msg: `No user found with email: ${email}` }); return }
      if (match.role === newRole) { setRoleStatus({ ok: false, msg: `${email} already has the ${newRole} role` }); return }
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
    } catch { /* ignore */ }
    finally { setRevokingId(null) }
  }

  async function broadcast() {
    if (!broadcastTitle || !broadcastBody) return
    try {
      await adminApi.broadcastPush(broadcastTitle, broadcastBody)
      setStatus('Push notification broadcast queued')
      setBroadcastTitle(''); setBroadcastBody('')
    } catch { setStatus('Broadcast failed') }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-xl font-display font-bold text-white">System Controls</h1>

      {status && (
        <div className="rounded-xl bg-purple-600/10 border border-purple-500/20 px-4 py-2.5 text-sm text-purple-300">
          {status}
        </div>
      )}

      {/* Maintenance Mode */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Maintenance Mode</h2>
        <p className="text-xs text-white/40">When enabled, all non-admin routes return 503. Admin panel stays accessible.</p>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${maintenanceMode ? 'bg-red-500' : 'bg-white/10'}`} onClick={() => !toggleLoading && void toggleMaintenance()}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform m-0.5 ${maintenanceMode ? 'translate-x-6' : ''}`} />
          </div>
          <span className={`text-sm font-medium ${maintenanceMode ? 'text-red-400' : 'text-white/40'}`}>
            {maintenanceMode ? 'MAINTENANCE MODE ON' : 'Off'}
          </span>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Feature Flags</h2>
        {flags.length === 0 ? (
          <p className="text-xs text-white/30">No feature flags configured yet.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white font-mono">{f.key}</p>
                  {f.description && <p className="text-xs text-white/30">{f.description}</p>}
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${f.enabled ? 'bg-purple-500' : 'bg-white/10'}`}
                  onClick={() => void toggleFlag(f.key, f.enabled)}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform m-0.5 ${f.enabled ? 'translate-x-5' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cache Flush */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Flush Cache</h2>
        <p className="text-xs text-white/40">Enter a key pattern to clear from Redis (e.g. <code className="text-purple-400">email:msg_waiting:*</code>).</p>
        <div className="flex gap-2">
          <input
            value={cachePattern}
            onChange={(e) => setCachePattern(e.target.value)}
            placeholder="Key pattern…"
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 font-mono"
          />
          <button onClick={() => void flushCache()} disabled={!cachePattern} className="rounded-xl bg-amber-600 text-white text-sm px-4 py-2 disabled:opacity-40 hover:bg-amber-700 transition-colors">Flush</button>
        </div>
      </div>

      {/* Role Management */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Role Management</h2>
          <p className="text-xs text-white/40 mt-0.5">Grant or revoke the Moderator role by email address.</p>
        </div>

        {/* Current admins & mods */}
        {elevatedUsers.length > 0 && (
          <div className="space-y-1.5">
            {elevatedUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/4 border border-white/6 px-3.5 py-2.5">
                <div className="min-w-0">
                  {u.profile?.displayName && (
                    <p className="text-sm text-white font-medium truncate">{u.profile.displayName}</p>
                  )}
                  <p className="text-xs text-white/50 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {u.role}
                  </span>
                  {u.role === 'moderator' && (
                    <button
                      onClick={() => void handleRevoke(u)}
                      disabled={revokingId === u.id}
                      className="text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
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
          <div className={`rounded-xl px-3.5 py-2.5 text-xs font-medium ${roleStatus.ok ? 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-600/10 border border-red-500/20 text-red-400'}`}>
            {roleStatus.msg}
          </div>
        )}

        <input
          value={roleEmail}
          onChange={(e) => { setRoleEmail(e.target.value); setRoleStatus(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleRoleChange('moderator') }}
          placeholder="user@example.com"
          type="email"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
        />

        <div className="flex gap-2">
          <button
            onClick={() => void handleRoleChange('moderator')}
            disabled={!roleEmail.trim() || roleLoading}
            className="flex-1 rounded-xl bg-purple-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-40 hover:bg-purple-700 transition-colors"
          >
            {roleLoading ? 'Updating…' : 'Grant Moderator'}
          </button>
          <button
            onClick={() => void handleRoleChange('user')}
            disabled={!roleEmail.trim() || roleLoading}
            className="rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm px-4 py-2 disabled:opacity-40 hover:bg-white/10 hover:text-white transition-colors"
          >
            Revoke
          </button>
        </div>
      </div>

      {/* Broadcast Push */}
      <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Broadcast Push Notification</h2>
        <p className="text-xs text-white/40">Send a push notification to all subscribed users.</p>
        <input
          value={broadcastTitle}
          onChange={(e) => setBroadcastTitle(e.target.value)}
          placeholder="Title…"
          maxLength={60}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
        />
        <textarea
          value={broadcastBody}
          onChange={(e) => setBroadcastBody(e.target.value)}
          placeholder="Message…"
          maxLength={200}
          rows={3}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-purple-500/50"
        />
        <button
          onClick={() => void broadcast()}
          disabled={!broadcastTitle || !broadcastBody}
          className="rounded-xl bg-purple-600 text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:bg-purple-700 transition-colors"
        >
          Send Broadcast
        </button>
      </div>
    </div>
  )
}
