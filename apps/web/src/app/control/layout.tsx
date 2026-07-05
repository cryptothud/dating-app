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
    <div className="min-h-[100dvh] bg-[#080613] flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 25% 15%, hsl(270 70% 25%) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, hsl(330 65% 20%) 0%, transparent 55%)' }} />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="font-display font-bold text-xl text-purple-400 tracking-tight">CRUSH</span>
          <span className="ml-2 text-xs text-white/30 font-mono">admin</span>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-amber-400/80">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            </span>
            Site is under maintenance
          </p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="rounded-2xl bg-[#0d0a16] border border-white/8 p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-600/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-400">{error}</div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
              placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading || !email || !password}
            className="w-full rounded-xl bg-purple-600 text-white text-sm font-semibold py-2.5 disabled:opacity-40 hover:bg-purple-700 transition-colors">
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
      .then((data: { maintenance: boolean } | null) => { setMaintenance(data?.maintenance ?? false) })
      .catch(() => { setMaintenance(false) })
  }, [])

  // Also listen for the global maintenance event (any 503 from any call)
  useEffect(() => {
    const handler = () => { setMaintenance(true) }
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
      <div className="min-h-[100dvh] bg-[#0d0a16] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (uiState === 'login') return <AdminLogin onSuccess={handleLoginSuccess} />

  return (
    <div className="min-h-[100dvh] bg-[#080613] flex">
      <aside className={[
        'fixed inset-y-0 left-0 z-40 w-56 bg-[#0d0a16] border-r border-white/8 flex flex-col transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0 md:static md:flex',
      ].join(' ')}>
        <div className="flex items-center gap-2 px-5 h-14 border-b border-white/8">
          <span className="font-display font-bold text-lg text-purple-400">CRUSH</span>
          <span className="text-xs text-white/30 font-mono">admin</span>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href + '/') || pathname === href
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={['flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-purple-600/20 text-purple-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'].join(' ')}>
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-white/8">
          <p className="text-xs text-white/30 truncate">{user?.email}</p>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 h-14 px-5 bg-[#0d0a16] border-b border-white/8 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 hover:text-white">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
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
