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

export function EventPanel({
  event,
  isAuthenticated,
  isPremium = true,
  onClose,
  onRsvpChange,
}: Props): React.JSX.Element {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleRsvp(): Promise<void> {
    if (!isAuthenticated) {
      router.push('/signup')
      return
    }
    setBusy(true)
    try {
      const { conversationId } = await eventsApi.rsvp(event.id)
      onRsvpChange({ ...event, hasRsvped: true, rsvpCount: event.rsvpCount + 1, conversationId })
    } finally {
      setBusy(false)
    }
  }

  async function handleCancelRsvp(): Promise<void> {
    setBusy(true)
    try {
      await eventsApi.cancelRsvp(event.id)
      onRsvpChange({
        ...event,
        hasRsvped: false,
        rsvpCount: event.rsvpCount - 1,
        conversationId: null,
      })
    } finally {
      setBusy(false)
    }
  }

  const isFull = event.maxAttendees !== null && event.rsvpCount >= event.maxAttendees

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 350 }}
      className="bg-background/[0.97] border-border absolute inset-x-0 bottom-0 z-30 rounded-t-2xl border-t backdrop-blur-xl dark:bg-[hsl(260_28%_5%/0.98)]"
      style={{ maxHeight: '60%' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pb-1 pt-3">
        <div className="bg-border h-1 w-9 rounded-full" />
      </div>

      <div className="overflow-y-auto px-5 pb-5" style={{ maxHeight: 'calc(60vh - 2rem)' }}>
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="mr-3 min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <span className="text-xs font-medium uppercase tracking-wide text-amber-500">
                Event
              </span>
            </div>
            <h2 className="text-foreground text-base font-bold leading-snug">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta */}
        <div className="text-muted-foreground mb-4 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatEventTime(event.scheduledAt)}
          </span>
          {event.displayArea && isPremium && (
            <span className="flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {event.displayArea}
            </span>
          )}
          {!isPremium && event.displayArea && (
            <span className="text-muted-foreground/40 flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Location hidden
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            {event.rsvpCount}
            {event.maxAttendees ? `/${event.maxAttendees}` : ''} going
          </span>
        </div>

        {isPremium ? (
          <>
            {event.description && (
              <p className="text-foreground/80 mb-5 text-sm leading-relaxed">{event.description}</p>
            )}
            {/* Actions */}
            <div className="flex gap-2">
              {event.hasRsvped ? (
                <>
                  {event.conversationId && (
                    <button
                      onClick={() => router.push(`/messages/${event.conversationId}`)}
                      className="bg-primary h-10 flex-1 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Open chat
                    </button>
                  )}
                  <button
                    onClick={handleCancelRsvp}
                    disabled={busy}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 h-10 flex-1 rounded-2xl border text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {busy ? 'Cancelling…' : 'Cancel RSVP'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRsvp}
                  disabled={busy || isFull}
                  className="bg-primary h-10 flex-1 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {isFull ? 'Event full' : busy ? 'RSVPing…' : 'RSVP'}
                </button>
              )}
            </div>
          </>
        ) : (
          /* Non-premium gate */
          <div className="bg-amber-500/[0.08] flex flex-col gap-3 rounded-xl border border-amber-500/20 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 fill-amber-400">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <p className="text-foreground/90 text-sm leading-snug">
                Upgrade to Premium to RSVP, join the event chat, and see full details.
              </p>
            </div>
            <button
              onClick={() => {
                onClose()
                router.push('/upgrade')
              }}
              className="h-10 w-full rounded-xl bg-amber-500 text-sm font-semibold text-black transition-colors hover:bg-amber-600"
            >
              Upgrade to Premium
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
