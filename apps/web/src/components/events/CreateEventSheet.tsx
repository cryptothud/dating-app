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
    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round">
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
    if (!title.trim()) { setError('Title is required'); return }
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
          className="absolute bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-3xl shadow-2xl"
          style={{ maxHeight: '85vh', overflow: 'hidden' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 28px)' }}>
            <div className="px-5 py-4 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-display text-foreground">
                    {isPremium ? 'Create an Event' : 'Events'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPremium ? 'Invite nearby people to meet up' : 'Meet up with people near you'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              {!isPremium ? (
                <div className="flex flex-col items-center text-center gap-5 py-4">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-amber-500" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" />
                    </svg>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-semibold text-foreground">Events are a Premium feature</p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                      Event pins show up on the map for everyone. Tap any amber dot to see an event. To create events and RSVP, you need Premium.
                    </p>
                  </div>

                  {/* What you get */}
                  <div className="w-full rounded-xl bg-muted/60 px-4 py-3 space-y-2.5 text-left">
                    {[
                      'Pin meetups on the map for nearby people to find',
                      'RSVP and join the event group chat',
                      'See who else is going',
                    ].map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <span className="text-amber-400 shrink-0 mt-px">✓</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { onClose(); router.push('/upgrade') }}
                    className="w-full h-11 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-600 transition-colors"
                  >
                    Upgrade to Premium
                  </button>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Tap any event pin on the map to preview it
                  </p>
                </div>
              ) : success ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-emerald-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Event created!</p>
                    <p className="text-sm text-muted-foreground mt-1">Your event pin is now visible on the map.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Event title <span className="text-destructive">*</span></label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Rooftop hangout, Coffee meetup…"
                      className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Date/time */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">When <span className="text-destructive">*</span></label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Location label */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Location name <span className="text-muted-foreground/50">(optional)</span></label>
                    <input
                      value={displayArea}
                      onChange={(e) => setDisplayArea(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Central Park, Downtown…"
                      className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {!defaultLat && (
                      <p className="text-xs text-amber-500 mt-1">Your current location will be used as the event pin.</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description <span className="text-muted-foreground/50">(optional)</span></label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="What's the vibe? What are you planning to do?"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Max attendees */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max attendees <span className="text-muted-foreground/50">(optional)</span></label>
                    <input
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(e.target.value.replace(/\D/g, ''))}
                      placeholder="Leave blank for unlimited"
                      inputMode="numeric"
                      className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {error && <p className="text-xs text-destructive">{error}</p>}

                  <button
                    onClick={() => void handleCreate()}
                    disabled={saving || !title.trim()}
                    className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
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
