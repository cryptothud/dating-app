'use client'

import { useEffect, useState } from 'react'
import { adminApi, type AdminStats } from '@/lib/admin'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-display font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" /></div>
  }

  if (!stats) {
    return <p className="text-white/40 text-sm">Failed to load stats.</p>
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-0.5">Platform overview</p>
      </div>

      {stats.maintenanceMode && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-400 font-medium">
          ⚠ Maintenance mode is active — users see a 503 page
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Online Now" value={stats.onlineNow} sub="active in last 5 min" />
        <StatCard label="New Today" value={stats.newUsersToday} sub={`${stats.monthlySignups} this month`} />
        <StatCard label="Active Subs" value={stats.activeSubscriptions} />
        <StatCard label="Messages" value={stats.messagesTotal} />
        <StatCard label="Open Reports" value={stats.openReports} />
        <StatCard label="Open Tickets" value={stats.openTickets} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#0d0a16] border border-white/8 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/control/moderation" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="text-sm text-white/70">Review open reports</span>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{stats.openReports}</span>
            </a>
            <a href="/control/support" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="text-sm text-white/70">Support tickets</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{stats.openTickets}</span>
            </a>
            <a href="/control/system" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="text-sm text-white/70">System controls</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/30 fill-none stroke-current" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
