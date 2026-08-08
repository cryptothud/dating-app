'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function MaintenanceOverlay(): React.JSX.Element | null {
  const [active, setActive] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => {
      // Never activate the overlay on the admin panel — it handles its own state
      if (window.location.pathname.startsWith('/control')) return
      setActive(true)
    }
    window.addEventListener('crush_maintenance', handler)
    return () => window.removeEventListener('crush_maintenance', handler)
  }, [])

  // Double-guard: also suppress via pathname in case of navigation
  if (!active || pathname.startsWith('/control')) return null

  return (
    <div className="bg-background fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 block dark:hidden"
          style={{
            background:
              'radial-gradient(ellipse at 20% 20%, hsl(270 80% 93%) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(330 80% 93%) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              'radial-gradient(ellipse at 25% 15%, hsl(270 70% 25%) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, hsl(330 65% 20%) 0%, transparent 55%)',
          }}
        />
      </div>

      <div className="relative z-10 flex max-w-sm flex-col items-center gap-5">
        <span className="font-display text-primary text-2xl font-bold tracking-tight">CRUSH</span>

        <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-2xl">
          <svg
            viewBox="0 0 24 24"
            className="stroke-primary h-7 w-7 fill-none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-foreground text-2xl font-bold">Down for maintenance</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We&apos;re making some improvements. We&apos;ll be back shortly — check back in a few
            minutes.
          </p>
        </div>

        <div className="text-muted-foreground/60 flex items-center gap-1.5 text-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          Maintenance in progress
        </div>
      </div>
    </div>
  )
}
