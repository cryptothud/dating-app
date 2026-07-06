'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { HamburgerMenu } from '@/components/ui/hamburger-menu'
import { useAuth } from '@/hooks/use-auth'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { AgeGateModal } from '@/components/age-gate/AgeGateModal'
import { GlobalChatPanel } from '@/components/chat/GlobalChatPanel'
import { CreateEventSheet } from '@/components/events/CreateEventSheet'
import { useEffect, useRef, useState, useCallback } from 'react'
import { chatApi } from '@/lib/chat'
import { useSocket } from '@/hooks/use-socket'
import { useSubscription } from '@/hooks/use-subscription'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

function MapIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 16l4.553-2.276A1 1 0 0021 19.382V8.618a1 1 0 00-.553-.894L15 5m0 15V5m0 0L9 7" />
    </svg>
  )
}

function ChatIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function ProfileIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
    </svg>
  )
}

function ShieldIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SettingsIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function JoinIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

const AUTH_NAV = [
  { href: '/map', label: 'Map', Icon: MapIcon },
  { href: '/messages', label: 'DMs', Icon: ChatIcon },
  { href: '/safety-date', label: 'Safety', Icon: ShieldIcon },
  { href: '/profile', label: 'Profile', Icon: ProfileIcon },
]

const ANON_NAV = [
  { href: '/map', label: 'Map', Icon: MapIcon },
  { href: '/signup', label: 'Join', Icon: JoinIcon },
]

export default function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const socket = useSocket()
  const [totalUnread, setTotalUnread] = useState(0)

  const loadUnread = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const convs = await chatApi.getConversations()
      setTotalUnread(convs.reduce((sum, c) => sum + c.unreadCount, 0))
    } catch { /* noop */ }
  }, [isAuthenticated])

  useEffect(() => {
    void loadUnread()
  }, [loadUnread])

  // Poll every 30s as fallback — catches messages that arrive before the socket connects
  useEffect(() => {
    if (!isAuthenticated) return
    const id = setInterval(() => { void loadUnread() }, 30_000)
    return () => clearInterval(id)
  }, [isAuthenticated, loadUnread])

  useEffect(() => {
    if (!isAuthenticated) return
    const onNewDm = (payload: { conversationId: string; senderId: string; senderName?: string; senderAvatar?: string | null; body?: string }) => {
      const isOnThread = pathname === `/messages/${payload.senderId}`
      if (!isOnThread) {
        setTotalUnread((n) => n + 1)
        const name = payload.senderName ?? 'Someone'
        toast.info('', {
          force: true,
          duration: 6000,
          onClick: () => router.push(`/messages/${payload.senderId}`),
          meta: {
            type: 'dm',
            senderName: name,
            avatarUrl: payload.senderAvatar,
            preview: payload.body ? payload.body.slice(0, 80) : undefined,
          },
        })
      }
    }
    socket.on('new_dm', onNewDm)
    return () => { socket.off('new_dm', onNewDm) }
  }, [socket, isAuthenticated, pathname, router])

  // Warning notifications — delivered immediately via WarnBus if online, or on next connect if offline
  useEffect(() => {
    if (!isAuthenticated) return
    const onWarned = ({ reason }: { reason: string }) => {
      toast.warning(`You have received an account warning: ${reason}`, { duration: 0, force: true })
    }
    socket.on('user_warned', onWarned)
    // One-time check on mount covers edge cases (e.g. server restarted while user was connected)
    socket.emit('check_warnings')
    return () => { socket.off('user_warned', onWarned) }
  }, [socket, isAuthenticated])

  // Re-sync when user lands on /messages* (mark-as-read resets server-side count)
  useEffect(() => {
    if (pathname.startsWith('/messages')) void loadUnread()
  }, [pathname, loadUnread])

  // Thread page emits this event immediately after marking its conversation read
  useEffect(() => {
    const handler = () => void loadUnread()
    window.addEventListener('crush_mark_read', handler)
    return () => window.removeEventListener('crush_mark_read', handler)
  }, [loadUnread])

  const lastNonSettingsPathRef = useRef('/map')
  useEffect(() => {
    if (!pathname.startsWith('/settings')) lastNonSettingsPathRef.current = pathname
  }, [pathname])

  function handleSettingsClick(): void {
    if (pathname.startsWith('/settings')) {
      router.push(lastNonSettingsPathRef.current)
    } else {
      router.push('/settings')
    }
  }

  // Keep lastActive fresh so "Active now" is accurate across all pages
  useEffect(() => {
    if (!isAuthenticated) return
    const beat = () => { void api.post('/location/heartbeat', {}) }
    beat()
    const id = setInterval(beat, 60_000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  usePushNotifications(isAuthenticated)
  const { isPremium } = useSubscription(isAuthenticated)
  const [eventSheetOpen, setEventSheetOpen] = useState(false)
  // 'anon-intent' = user clicked "Use Anonymously" and needs to pass the age gate
  // 'required'    = user landed on /map without intent → redirect to / to sign in first
  const [gateState, setGateState] = useState<'pending' | 'required' | 'anon-intent' | 'clear'>('pending')

  // Must run client-side only — sessionStorage doesn't exist on the server.
  // Starting with 'pending' ensures server and client render identically (no hydration mismatch).
  useEffect(() => {
    if (sessionStorage.getItem('crush_age_verified') === '1') {
      setGateState('clear')
    } else if (sessionStorage.getItem('crush_anon_intent') === '1') {
      sessionStorage.removeItem('crush_anon_intent')
      setGateState('anon-intent')
    } else {
      setGateState('required')
    }
  }, [])

  useEffect(() => {
    if (!isLoading && isAuthenticated) setGateState('clear')
    // Only redirect if user hasn't explicitly chosen anonymous mode
    if (!isLoading && !isAuthenticated && gateState === 'required') router.replace('/')
  }, [isAuthenticated, isLoading, gateState, router])

  const [chatOpen, setChatOpen] = useState(false)
  const [globalUnread, setGlobalUnread] = useState(0)

  // Auto-join global room on /map so badge can fire even when the panel is closed
  useEffect(() => {
    if (pathname.startsWith('/map')) socket.emit('join_global')
    else {
      setChatOpen(false)
      socket.emit('leave_global')
    }
  }, [pathname, socket])

  // Track unread global messages — bump count when panel is closed, clear on open
  useEffect(() => {
    const onGlobalMsg = () => {
      if (!chatOpen) setGlobalUnread((n) => n + 1)
    }
    socket.on('global_message', onGlobalMsg)
    return () => { socket.off('global_message', onGlobalMsg) }
  }, [socket, chatOpen])

  useEffect(() => {
    if (chatOpen) setGlobalUnread(0)
  }, [chatOpen])

  const navItems = isAuthenticated ? AUTH_NAV : ANON_NAV
  const showMap = gateState === 'clear'
  const showGate = gateState === 'required' || gateState === 'anon-intent'

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Solid header — outside the map */}
      <header className="relative z-50 flex-shrink-0 flex items-center justify-between px-5 bg-background border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <Link href="/" className="font-display font-bold text-xl text-primary tracking-tight">CRUSH</Link>
        <div className="flex items-center gap-2">
          {!isLoading && !isAuthenticated && (
            <>
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden sm:block text-sm font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign up
              </Link>
            </>
          )}
          {!isLoading && isAuthenticated && (
            <button
              onClick={handleSettingsClick}
              aria-label="Settings"
              className={[
                'w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-muted',
                pathname.startsWith('/settings') ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <SettingsIcon />
            </button>
          )}
          <ThemeToggle />
          <HamburgerMenu />
        </div>
      </header>

      {/* Map container — framed with brand border */}
      <main className="flex-1 min-h-0 p-2 bg-background">
        <div className="relative w-full h-full rounded-xl border-2 border-primary/25 overflow-hidden shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]">
          {/* Map only mounts after age verification */}
          {showMap && children}

          {/* Placeholder shown while pending auth check or gate is active */}
          {!showMap && (
            <div className="absolute inset-0 flex items-center justify-center bg-background dark:bg-[hsl(260_30%_4%)]">
              {/* Light-mode gradient */}
              <div
                className="pointer-events-none absolute inset-0 block dark:hidden"
                style={{ background: 'radial-gradient(ellipse at 15% 15%, hsl(270 80% 93%) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, hsl(330 80% 93%) 0%, transparent 50%)' }}
              />
              {/* Dark-mode gradient */}
              <div
                className="pointer-events-none absolute inset-0 hidden dark:block"
                style={{ background: 'radial-gradient(ellipse at 25% 15%, hsl(270 70% 25%) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, hsl(330 65% 20%) 0%, transparent 55%)' }}
              />
              {gateState === 'pending' && (
                <div className="relative z-10 w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              )}
            </div>
          )}

          {/* Age gate — full-cover, map is NOT loaded behind it */}
          {showGate && (
            <div className="absolute inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center px-6 py-4 sm:px-4">
                <AgeGateModal
                  onVerified={() => {
                    sessionStorage.setItem('crush_age_verified', '1')
                    sessionStorage.removeItem('crush_anon_intent')
                    setGateState('clear')
                  }}
                  onGoBack={() => { window.location.href = '/' }}
                />
              </div>
            </div>
          )}

          {/* FABs — map only */}
          {pathname.startsWith('/map') && (
            <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2">
              {/* Events FAB — browse for free, create with Premium */}
              {isAuthenticated && (
                <button
                  onClick={() => setEventSheetOpen((o) => !o)}
                  title={isPremium ? 'Create an event' : 'Browse events'}
                  className={[
                    'flex items-center gap-1.5 pl-3 pr-4 py-2 rounded-full text-sm font-semibold shadow-lg transition-all',
                    isPremium
                      ? 'bg-amber-500 text-black hover:bg-amber-600'
                      : 'bg-muted/90 dark:bg-muted text-foreground hover:bg-muted border border-border',
                  ].join(' ')}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" />
                  </svg>
                  Event
                </button>
              )}
              {/* Global chat FAB — only when age-verified or signed in */}
              {showMap && <button
                onClick={() => setChatOpen((o) => !o)}
                aria-label={chatOpen ? 'Close global chat' : 'Open global chat'}
                className={[
                  'relative flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-full text-sm font-semibold shadow-xl transition-all',
                  chatOpen
                    ? 'bg-primary/80 text-white ring-2 ring-primary/40'
                    : 'bg-primary text-white hover:bg-primary/90',
                ].join(' ')}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                Global
                {globalUnread > 0 && !chatOpen && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive flex items-center justify-center text-[9px] font-bold text-white px-0.5 shadow">
                    {globalUnread > 99 ? '99+' : globalUnread}
                  </span>
                )}
              </button>}
            </div>
          )}

          {/* Global chat panel — map only, slides up over the map */}
          {pathname.startsWith('/map') && (
            <AnimatePresence>
              {chatOpen && (
                <GlobalChatPanel
                  onClose={() => setChatOpen(false)}
                  isAuthenticated={isAuthenticated}
                  currentUserId={user?.id}
                  isMod={user?.role === 'moderator' || user?.role === 'admin'}
                />
              )}
            </AnimatePresence>
          )}

          {/* Create event sheet — map only */}
          {pathname.startsWith('/map') && eventSheetOpen && (
            <CreateEventSheet onClose={() => setEventSheetOpen(false)} isPremium={isPremium} />
          )}
        </div>
      </main>

      {/* Solid bottom nav — outside the map */}
      <nav
        className="flex-shrink-0 flex items-center justify-around px-2 bg-background border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', minHeight: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/map' && pathname.startsWith(href + '/'))
          const cls = [
            'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors relative',
            active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')
          const showBadge = href === '/messages' && totalUnread > 0 && isAuthenticated

          return (
            <Link key={href} href={href} className={cls} onClick={() => { setChatOpen(false); if (href === '/messages') setTotalUnread(0) }}>
              <span className="relative">
                <Icon />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
