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

export function CreateEventModal({ lat, lng, displayArea, onClose, onCreated }: Props): React.JSX.Element {
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

    if (!title.trim()) { setError('Title is required'); return }
    if (!date || !time) { setError('Date and time are required'); return }

    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    if (new Date(scheduledAt) <= new Date()) { setError('Event must be in the future'); return }

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
      <div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center">
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
          className="relative z-50 w-full sm:max-w-md bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-9 h-1 rounded-full bg-border" />
          </div>

          <div className="px-5 pt-4 pb-6 sm:pt-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold font-display text-foreground">Create Event</h2>
                {displayArea && (
                  <p className="text-xs text-muted-foreground mt-0.5">Near {displayArea}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's happening?"
                  maxLength={80}
                  className="w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell people more about this event…"
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={minDatetime.slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Time <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Max attendees */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Max attendees <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min={2}
                  max={500}
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  placeholder="No limit"
                  className="w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive font-medium">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-2xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
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
