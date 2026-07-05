'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { eventsApi, formatEventTime } from '@/lib/events'
import type { EventSummary } from '@dating-app/types'

interface Props {
  event: EventSummary
  isAuthenticated: boolean
  isPremium?: boolean
  onClose: () => void
  onRsvpChange: (updated: EventSummary) => void
}

export function EventPanel({ event, isAuthenticated, isPremium = true, onClose, onRsvpChange }: Props): React.JSX.Element {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleRsvp(): Promise<void> {
    if (!isAuthenticated) { router.push('/signup'); return }
    setBusy(true)
    try {
      const { conversationId } = await eventsApi.rsvp(event.id)
      onRsvpChange({ ...event, hasRsvped: true, rsvpCount: event.rsvpCount + 1, conversationId })
    } finally { setBusy(false) }
  }

  async function handleCancelRsvp(): Promise<void> {
    setBusy(true)
    try {
      await eventsApi.cancelRsvp(event.id)
      onRsvpChange({ ...event, hasRsvped: false, rsvpCount: event.rsvpCount - 1, conversationId: null })
    } finally { setBusy(false) }
  }

  const isFull = event.maxAttendees !== null && event.rsvpCount >= event.maxAttendees

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 350 }}
      className="absolute inset-x-0 bottom-0 z-30 bg-background/97 dark:bg-[hsl(260_28%_5%/0.98)] backdrop-blur-xl border-t border-border rounded-t-2xl"
      style={{ maxHeight: '60%' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-9 h-1 rounded-full bg-border" />
      </div>

      <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: 'calc(60vh - 2rem)' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">Event</span>
            </div>
            <h2 className="text-base font-bold text-foreground leading-snug">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatEventTime(event.scheduledAt)}
          </span>
          {event.displayArea && isPremium && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              {event.displayArea}
            </span>
          )}
          {!isPremium && event.displayArea && (
            <span className="flex items-center gap-1 text-muted-foreground/40">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Location hidden
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            {event.rsvpCount}{event.maxAttendees ? `/${event.maxAttendees}` : ''} going
          </span>
        </div>

        {isPremium ? (
          <>
            {event.description && (
              <p className="text-sm text-foreground/80 leading-relaxed mb-5">{event.description}</p>
            )}
            {/* Actions */}
            <div className="flex gap-2">
              {event.hasRsvped ? (
                <>
                  {event.conversationId && (
                    <button
                      onClick={() => router.push(`/messages/${event.conversationId}`)}
                      className="flex-1 h-10 rounded-2xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      Open chat
                    </button>
                  )}
                  <button
                    onClick={handleCancelRsvp}
                    disabled={busy}
                    className="flex-1 h-10 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    {busy ? 'Cancelling…' : 'Cancel RSVP'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRsvp}
                  disabled={busy || isFull}
                  className="flex-1 h-10 rounded-2xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {isFull ? 'Event full' : busy ? 'RSVPing…' : 'RSVP'}
                </button>
              )}
            </div>
          </>
        ) : (
          /* Non-premium gate */
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-3.5 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-amber-400 shrink-0 mt-0.5">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <p className="text-sm text-foreground/90 leading-snug">
                Upgrade to Premium to RSVP, join the event chat, and see full details.
              </p>
            </div>
            <button
              onClick={() => { onClose(); router.push('/upgrade') }}
              className="w-full h-10 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-600 transition-colors"
            >
              Upgrade to Premium
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
