'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { eventsApi } from '@/lib/events'
import type { EventSummary } from '@dating-app/types'

interface Props {
  lat: number
  lng: number
  displayArea?: string
  onClose: () => void
  onCreated: (event: EventSummary) => void
}

export function CreateEventModal({
  lat,
  lng,
  displayArea,
  onClose,
  onCreated,
}: Props): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const minDatetime = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!date || !time) {
      setError('Date and time are required')
      return
    }

    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    if (new Date(scheduledAt) <= new Date()) {
      setError('Event must be in the future')
      return
    }

    setSubmitting(true)
    try {
      const event = await eventsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        latitude: lat,
        longitude: lng,
        displayArea,
        scheduledAt,
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      })
      onCreated(event)
    } catch {
      setError('Failed to create event. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-40 flex items-end justify-center sm:items-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 350 }}
          className="bg-background border-border relative z-50 w-full rounded-t-2xl border shadow-2xl sm:max-w-md sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pb-1 pt-3 sm:hidden">
            <div className="bg-border h-1 w-9 rounded-full" />
          </div>

          <div className="px-5 pb-6 pt-4 sm:pt-5">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-foreground text-base font-bold">Create Event</h2>
                {displayArea && (
                  <p className="text-muted-foreground mt-0.5 text-xs">Near {displayArea}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-semibold">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's happening?"
                  maxLength={80}
                  className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-1"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-semibold">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell people more about this event…"
                  maxLength={500}
                  rows={3}
                  className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-semibold">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={minDatetime.slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-muted/60 border-border text-foreground focus:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-1"
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-semibold">
                    Time <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-muted/60 border-border text-foreground focus:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              {/* Max attendees */}
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-semibold">
                  Max attendees{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min={2}
                  max={500}
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  placeholder="No limit"
                  className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-1"
                />
              </div>

              {error && <p className="text-destructive text-xs font-medium">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 h-11 flex-1 rounded-2xl border text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary h-11 flex-1 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
