'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface Props {
  onClose: () => void
  isPremium?: boolean
  defaultLat?: number
  defaultLng?: number
}

interface EventResponse {
  id: string
  title: string
  scheduledAt: string
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      className="h-3.5 w-3.5 fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  )
}

export function CreateEventSheet({ onClose, isPremium = true, defaultLat, defaultLng }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [displayArea, setDisplayArea] = useState('')
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000) // +1 hour
    d.setMinutes(0, 0, 0)
    return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM"
  })
  const [maxAttendees, setMaxAttendees] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    const scheduled = new Date(scheduledAt)
    if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
      setError('Event must be scheduled in the future')
      return
    }

    setSaving(true)
    setError('')
    try {
      await api.post<EventResponse>('/events', {
        title: title.trim(),
        description: description.trim() || undefined,
        latitude: defaultLat ?? 0,
        longitude: defaultLng ?? 0,
        displayArea: displayArea.trim() || undefined,
        scheduledAt: scheduled.toISOString(),
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
      })
      setSuccess(true)
      setTimeout(onClose, 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event')
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="bg-background border-border absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t shadow-2xl"
          style={{ maxHeight: '85vh', overflow: 'hidden' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pb-1 pt-3">
            <div className="bg-border h-1 w-10 rounded-full" />
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 28px)' }}>
            <div className="space-y-5 px-5 py-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-foreground text-lg font-bold">
                    {isPremium ? 'Create an Event' : 'Events'}
                  </h2>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {isPremium ? 'Invite nearby people to meet up' : 'Meet up with people near you'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              {!isPremium ? (
                <div className="flex flex-col items-center gap-5 py-4 text-center">
                  {/* Icon */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8 fill-none stroke-amber-500"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="12" y1="14" x2="12" y2="18" />
                      <line x1="10" y1="16" x2="14" y2="16" />
                    </svg>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-foreground font-semibold">Events are a Premium feature</p>
                    <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                      Event pins show up on the map for everyone. Tap any amber dot to see an event.
                      To create events and RSVP, you need Premium.
                    </p>
                  </div>

                  {/* What you get */}
                  <div className="bg-muted/60 w-full space-y-2.5 rounded-xl px-4 py-3 text-left">
                    {[
                      'Pin meetups on the map for nearby people to find',
                      'RSVP and join the event group chat',
                      'See who else is going',
                    ].map((f) => (
                      <div key={f} className="text-foreground/80 flex items-start gap-2.5 text-sm">
                        <span className="mt-px shrink-0 text-amber-400">✓</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      onClose()
                      router.push('/upgrade')
                    }}
                    className="h-11 w-full rounded-xl bg-amber-500 text-sm font-semibold text-black transition-colors hover:bg-amber-600"
                  >
                    Upgrade to Premium
                  </button>
                  <p className="text-muted-foreground -mt-2 text-xs">
                    Tap any event pin on the map to preview it
                  </p>
                </div>
              ) : success ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7 fill-none stroke-emerald-500"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">Event created!</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Your event pin is now visible on the map.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                      Event title <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Rooftop hangout, Coffee meetup…"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1"
                    />
                  </div>

                  {/* Date/time */}
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                      When <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      className="bg-muted border-border text-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1"
                    />
                  </div>

                  {/* Location label */}
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                      Location name <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <input
                      value={displayArea}
                      onChange={(e) => setDisplayArea(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Central Park, Downtown…"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1"
                    />
                    {!defaultLat && (
                      <p className="mt-1 text-xs text-amber-500">
                        Your current location will be used as the event pin.
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                      Description <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="What's the vibe? What are you planning to do?"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-1"
                    />
                  </div>

                  {/* Max attendees */}
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                      Max attendees <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <input
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(e.target.value.replace(/\D/g, ''))}
                      placeholder="Leave blank for unlimited"
                      inputMode="numeric"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1"
                    />
                  </div>

                  {error && <p className="text-destructive text-xs">{error}</p>}

                  <button
                    onClick={() => void handleCreate()}
                    disabled={saving || !title.trim()}
                    className="bg-primary h-11 w-full rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {saving ? 'Creating…' : 'Create Event'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
