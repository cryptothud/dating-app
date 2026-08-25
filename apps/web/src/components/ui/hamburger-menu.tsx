'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { authApi } from '@/lib/auth'

const NAV_LINKS = [
  { href: '/map', label: 'Browse Map' },
  { href: '/about', label: 'About CRUSH' },
]

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/safety', label: 'Safety' },
  { href: '/2257', label: '§ 2257' },
  { href: '/takedown', label: 'TAKE IT DOWN Act' },
  { href: '/content-removal', label: 'Content Removal' },
]

interface Props {
  className?: string
}

export function HamburgerMenu({ className }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { isAuthenticated } = useAuth()

  async function handleSignOut(): Promise<void> {
    setOpen(false)
    await authApi.logout().catch(() => {})
    window.location.href = '/'
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggle = (): void => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | TouchEvent): void => {
      if (!buttonRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScroll = (): void => setOpen(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="border-black/[0.08] fixed w-52 overflow-hidden rounded-2xl border bg-white/70 py-1.5 shadow-2xl dark:border-white/10 dark:bg-black/60"
          style={{
            top: pos.top,
            right: pos.right,
            transformOrigin: 'top right',
            zIndex: 9999,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          {/* Nav links */}
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="text-foreground/70 hover:text-foreground dark:hover:bg-white/[0.08] flex items-center px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:text-white/65 dark:hover:text-white"
            >
              {label}
            </Link>
          ))}

          {/* Sign out — auth only */}
          {isAuthenticated && (
            <>
              <div className="mx-3 my-1.5 h-px bg-black/15 dark:bg-white/20" />
              <button
                onClick={() => {
                  void handleSignOut()
                }}
                className="text-destructive dark:hover:bg-white/[0.08] flex w-full items-center px-4 py-2 text-sm transition-colors hover:bg-black/5"
              >
                Sign out
              </button>
            </>
          )}

          {/* Legal */}
          <div className="mx-3 my-1.5 h-px bg-black/15 dark:bg-white/20" />
          <div className="px-4 pb-2 pt-1">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
              Legal
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {LEGAL_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="truncate text-[10px] text-black/35 transition-colors hover:text-black/60 dark:text-white/30 dark:hover:text-white/55"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="x"
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="menu"
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>

      {mounted && createPortal(dropdown, document.body)}
    </div>
  )
}
