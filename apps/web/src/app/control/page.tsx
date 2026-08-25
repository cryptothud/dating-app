'use client'

import { useEffect, useState } from 'react'
import { adminApi, type AdminStats } from '@/lib/admin'
import Link from 'next/link'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border-white/[0.08] rounded-2xl border bg-[#0d0a16] p-5">
      <p className="mb-1 text-xs text-white/40">{label}</p>
      <p className="font-display text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-white/30">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  if (!stats) {
    return <p className="text-sm text-white/40">Failed to load stats.</p>
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-white">Dashboard</h1>
        <p className="mt-0.5 text-sm text-white/40">Platform overview</p>
      </div>

      {stats.maintenanceMode && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400">
          ⚠ Maintenance mode is active — users see a 503 page
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Online Now" value={stats.onlineNow} sub="active in last 5 min" />
        <StatCard
          label="New Today"
          value={stats.newUsersToday}
          sub={`${stats.monthlySignups} this month`}
        />
        <StatCard label="Active Subs" value={stats.activeSubscriptions} />
        <StatCard label="Messages" value={stats.messagesTotal} />
        <StatCard label="Open Reports" value={stats.openReports} />
        <StatCard label="Open Tickets" value={stats.openTickets} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border-white/[0.08] rounded-2xl border bg-[#0d0a16] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/control/moderation"
              className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
            >
              <span className="text-sm text-white/70">Review open reports</span>
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                {stats.openReports}
              </span>
            </Link>
            <Link
              href="/control/support"
              className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
            >
              <span className="text-sm text-white/70">Support tickets</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                {stats.openTickets}
              </span>
            </Link>
            <Link
              href="/control/system"
              className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
            >
              <span className="text-sm text-white/70">System controls</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current text-white/30"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
