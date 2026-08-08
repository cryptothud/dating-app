'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { adminApi } from '@/lib/admin'

const NAV = [
  { href: '/control', label: 'Dashboard', exact: true },
  { href: '/control/users', label: 'Users', exact: false },
  { href: '/control/moderation', label: 'Moderation', exact: false },
  { href: '/control/support', label: 'Support', exact: false },
  { href: '/control/audit', label: 'Audit Log', exact: false },
  { href: '/control/system', label: 'System', exact: false },
]

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminApi.adminLogin(email, password)
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials'
      setError(msg === 'maintenance' ? 'Server error — try again.' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#080613] px-4">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 25% 15%, hsl(270 70% 25%) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, hsl(330 65% 20%) 0%, transparent 55%)',
          }}
        />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="font-display text-xl font-bold tracking-tight text-purple-400">
            CRUSH
          </span>
          <span className="ml-2 font-mono text-xs text-white/30">admin</span>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-amber-400/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            Site is under maintenance
          </p>
        </div>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="border-white/8 space-y-4 rounded-2xl border bg-[#0d0a16] p-6"
        >
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-600/10 px-3.5 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-purple-500/50 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-purple-500/50 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
          >
            {loading ? 'Signing in…' : 'Sign in to Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}

type UiState = 'loading' | 'login' | 'panel' | 'redirect'

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [maintenance, setMaintenance] = useState<boolean | null>(null)
  const [uiState, setUiState] = useState<UiState>('loading')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check maintenance status via raw fetch — no api.ts so no toast on 404/error.
  // /api/admin/* is always allowed through the maintenance middleware.
  useEffect(() => {
    fetch('/api/admin/status', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { maintenance: boolean } | null) => {
        setMaintenance(data?.maintenance ?? false)
      })
      .catch(() => {
        setMaintenance(false)
      })
  }, [])

  // Also listen for the global maintenance event (any 503 from any call)
  useEffect(() => {
    const handler = () => {
      setMaintenance(true)
    }
    window.addEventListener('crush_maintenance', handler)
    return () => window.removeEventListener('crush_maintenance', handler)
  }, [])

  // Determine what to show once we know both auth and maintenance state
  useEffect(() => {
    if (isLoading || maintenance === null) return

    if (user?.role === 'admin') {
      setUiState('panel')
    } else if (user) {
      // Logged in but not admin
      setUiState('redirect')
    } else if (maintenance) {
      // Not logged in + maintenance → show admin login form
      setUiState('login')
    } else {
      // Not logged in + no maintenance → redirect to home
      setUiState('redirect')
    }
  }, [isLoading, maintenance, user])

  // After successful admin login: cookies are set, re-check auth
  function handleLoginSuccess() {
    // Reload so useAuth() picks up the new cookies
    window.location.reload()
  }

  // All redirects in useEffect — never in render body
  useEffect(() => {
    if (uiState === 'redirect') window.location.href = '/'
  }, [uiState])

  if (uiState === 'loading' || uiState === 'redirect') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d0a16]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  if (uiState === 'login') return <AdminLogin onSuccess={handleLoginSuccess} />

  return (
    <div className="flex min-h-[100dvh] bg-[#080613]">
      <aside
        className={[
          'border-white/8 fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r bg-[#0d0a16] transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:flex md:translate-x-0',
        ].join(' ')}
      >
        <div className="border-white/8 flex h-14 items-center gap-2 border-b px-5">
          <span className="font-display text-lg font-bold text-purple-400">CRUSH</span>
          <span className="font-mono text-xs text-white/30">admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {NAV.map(({ href, label, exact }) => {
            const active = exact
              ? pathname === href
              : pathname.startsWith(href + '/') || pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={[
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-purple-600/20 text-purple-300'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="border-white/8 border-t px-4 py-4">
          <p className="truncate text-xs text-white/30">{user?.email}</p>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-white/8 flex h-14 items-center gap-3 border-b bg-[#0d0a16] px-5 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 hover:text-white">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-display font-bold text-purple-400">Control</span>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
