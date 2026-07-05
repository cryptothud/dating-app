'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeToasts, toast, type ToastItem, type ToastVariant } from '@/lib/toast'

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: 'border-red-500/40 text-red-700 dark:text-red-400',
  success: 'border-green-500/40 text-green-700 dark:text-green-400',
  warning: 'border-amber-500/40 text-amber-700 dark:text-amber-400',
  info: 'border-primary/40 text-primary',
}

function VariantIcon({ variant }: { variant: ToastVariant }): React.JSX.Element {
  if (variant === 'error') {
    return (
      <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current flex-shrink-0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v5M10 14h.01" />
      </svg>
    )
  }
  if (variant === 'success') {
    return (
      <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current flex-shrink-0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10l4 4 8-8" />
      </svg>
    )
  }
  if (variant === 'warning') {
    return (
      <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current flex-shrink-0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l8 15H2L10 2zM10 8v4M10 15h.01" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current flex-shrink-0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6h.01" />
    </svg>
  )
}

function DmToastCard({ item }: { item: ToastItem }): React.JSX.Element {
  const { meta } = item
  const initials = (meta?.senderName ?? '?').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (item.duration <= 0) return
    const t = setTimeout(() => toast.dismiss(item.id), item.duration)
    return () => clearTimeout(t)
  }, [item.id, item.duration])

  const handleClick = item.onClick ? () => { item.onClick!(); toast.dismiss(item.id) } : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      onClick={handleClick}
      className={[
        'pointer-events-auto w-full rounded-xl shadow-xl overflow-hidden bg-background border border-primary/30',
        item.onClick ? 'cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity' : '',
      ].join(' ')}
    >
      <div className="h-[3px] bg-gradient-to-r from-primary to-primary/50" />
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="shrink-0 relative">
          {meta?.avatarUrl ? (
            <img src={meta.avatarUrl} alt={meta.senderName} className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/15 ring-2 ring-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1 ring-background" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider leading-none mb-0.5">New direct message</p>
          <p className="text-xs font-semibold text-foreground truncate">{meta?.senderName ?? 'Someone'}</p>
          {meta?.preview && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{meta.preview}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toast.dismiss(item.id) }}
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors outline-none"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

function StandardToastCard({ item }: { item: ToastItem }): React.JSX.Element {
  useEffect(() => {
    if (item.duration <= 0) return
    const t = setTimeout(() => toast.dismiss(item.id), item.duration)
    return () => clearTimeout(t)
  }, [item.id, item.duration])

  const handleClick = item.onClick ? () => {
    item.onClick!()
    toast.dismiss(item.id)
  } : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      onClick={handleClick}
      className={[
        'pointer-events-auto flex items-start gap-2.5 w-full px-3.5 py-3 rounded-xl shadow-xl',
        'bg-background border', VARIANT_STYLES[item.variant],
        item.onClick ? 'cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity' : '',
      ].join(' ')}
    >
      <VariantIcon variant={item.variant} />
      <p className="flex-1 text-xs font-medium leading-snug text-foreground break-words">{item.message}</p>
      <button
        onClick={(e) => { e.stopPropagation(); toast.dismiss(item.id) }}
        aria-label="Dismiss"
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors outline-none"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </motion.div>
  )
}

function ToastCard({ item }: { item: ToastItem }): React.JSX.Element {
  if (item.meta?.type === 'dm') return <DmToastCard item={item} />
  return <StandardToastCard item={item} />
}

export function ToastProvider(): React.JSX.Element | null {
  const [items, setItems] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)
  const portalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('data-toast-root', '')
    document.body.appendChild(el)
    portalRef.current = el
    setMounted(true)
    return () => {
      el.remove()
      portalRef.current = null
    }
  }, [])

  useEffect(() => subscribeToasts(setItems), [])

  if (!mounted || !portalRef.current) return null

  return createPortal(
    <div
      className="fixed z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{
        bottom: 'calc(4rem + 0.75rem + env(safe-area-inset-bottom))',
        right: '1rem',
        width: 'min(22rem, calc(100vw - 2rem))',
      }}
    >
      <AnimatePresence initial={false}>
        {items.map((item) => <ToastCard key={item.id} item={item} />)}
      </AnimatePresence>
    </div>,
    portalRef.current,
  )
}
