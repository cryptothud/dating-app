'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  active: boolean
  expiresAt: string | null
  onToggle: (next: boolean) => Promise<void>
}

export function ActivelyLookingButton({ active, expiresAt, onToggle }: Props): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !expiresAt) { setRemaining(null); return }

    const update = (): void => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [active, expiresAt])

  async function handleClick(): Promise<void> {
    setLoading(true)
    try { await onToggle(!active) } finally { setLoading(false) }
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading}
      whileTap={{ scale: 0.95 }}
      className={[
        'absolute bottom-4 right-[7.25rem] z-20 flex items-center gap-2',
        'px-4 py-2.5 rounded-full text-sm font-medium shadow-lg',
        'transition-colors duration-200 disabled:opacity-60',
        active
          ? 'bg-[hsl(var(--dot-active))] text-white'
          : 'bg-background/80 backdrop-blur-md text-foreground border border-border',
      ].join(' ')}
    >
      <AnimatePresence mode="wait">
        {active ? (
          <motion.span
            key="active"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Looking{remaining ? ` · ${remaining}` : ''}
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            Looking?
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
