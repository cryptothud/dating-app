'use client'

import { useState, useEffect, useCallback } from 'react'
import { safety, type SafetyDate } from '@/lib/safety'

const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '2 hr', value: 120 },
  { label: '4 hr', value: 240 },
]

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8 fill-none stroke-current"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function Countdown({ checkinAt }: { checkinAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(checkinAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Check-in overdue')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(h > 0 ? `${h}h ${m}m remaining` : `${m}m ${s}s remaining`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [checkinAt])

  return <span>{remaining}</span>
}

export default function SafetyPage() {
  const [session, setSession] = useState<SafetyDate | null | undefined>(undefined)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sosDone, setSosDone] = useState(false)

  const load = useCallback(async () => {
    const active = await safety.getActive()
    setSession(active)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function start() {
    if (!phone && !email) {
      setError('Add a phone or email for your trusted contact')
      return
    }
    setLoading(true)
    setError('')
    try {
      const s = await safety.create({
        trustedContactPhone: phone || undefined,
        trustedContactEmail: email || undefined,
        durationMinutes: duration,
      })
      setSession(s)
    } catch {
      setError('Could not start session — try again')
    } finally {
      setLoading(false)
    }
  }

  async function checkin() {
    if (!session) return
    setLoading(true)
    try {
      const s = await safety.checkin(session.id)
      setSession(s)
    } catch {
      setError('Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  async function triggerSos() {
    if (!session || !confirm('Send SOS to your trusted contact?')) return
    setLoading(true)
    try {
      await safety.sos(session.id)
      setSosDone(true)
    } catch {
      setError('SOS failed — call 911 directly')
    } finally {
      setLoading(false)
    }
  }

  async function end() {
    if (!session || !confirm('End this safety date session?')) return
    setLoading(true)
    try {
      await safety.end(session.id)
      setSession(null)
    } catch {
      setError('Could not end session')
    } finally {
      setLoading(false)
    }
  }

  const isActive = session && !session.endedAt

  return (
    <div className="bg-background min-h-full overflow-y-auto">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-green-500">
            <ShieldIcon />
          </span>
          <div>
            <h1 className="font-display text-foreground text-xl font-bold">Safety Date Mode</h1>
            <p className="text-muted-foreground text-sm">
              Share your live location with a trusted contact
            </p>
          </div>
        </div>

        {session === undefined && (
          <div className="flex justify-center py-8">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        )}

        {/* Active session */}
        {isActive && (
          <div className="space-y-4 rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                Session active
              </span>
              <span className="text-muted-foreground text-xs">
                <Countdown checkinAt={session.checkinAt} />
              </span>
            </div>

            {sosDone && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                SOS sent. Your trusted contact has been alerted.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => void checkin()}
                disabled={loading}
                className="rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                I&apos;m Safe — Check In
              </button>
              <button
                onClick={() => void triggerSos()}
                disabled={loading || sosDone}
                className="rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                SOS
              </button>
            </div>

            <button
              onClick={() => void end()}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground w-full text-sm underline transition-colors"
            >
              End session
            </button>
          </div>
        )}

        {/* Ended session */}
        {session && session.endedAt && (
          <div className="border-border bg-muted/30 space-y-3 rounded-2xl border p-5 text-center">
            <p className="text-foreground font-medium">Session ended safely</p>
            <button
              onClick={() => setSession(null)}
              className="text-primary text-sm hover:underline"
            >
              Start a new session
            </button>
          </div>
        )}

        {/* Start form */}
        {session === null && (
          <div className="space-y-5">
            <div className="border-border bg-card space-y-4 rounded-2xl border p-5">
              <h2 className="text-foreground text-sm font-semibold">Trusted contact</h2>
              <p className="text-muted-foreground text-xs">
                They&apos;ll receive a link to track your location and will be alerted if you miss
                your check-in.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-medium">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                  />
                </div>
                <div className="text-muted-foreground text-center text-xs">or</div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-medium">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            </div>

            <div className="border-border bg-card space-y-3 rounded-2xl border p-5">
              <h2 className="text-foreground text-sm font-semibold">Check-in duration</h2>
              <p className="text-muted-foreground text-xs">
                How long until you check in? We&apos;ll alert your contact if you miss it.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={[
                      'rounded-xl py-2 text-sm font-medium transition-colors',
                      duration === opt.value
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={() => void start()}
              disabled={loading}
              className="bg-primary w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Starting…' : 'Start Safety Date'}
            </button>

            <p className="text-muted-foreground text-center text-xs">
              Safety features are always free. Your location is fuzzed before sharing.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
