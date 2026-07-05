'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

const MIN_RADIUS = 200
const MAX_RADIUS = 2000

function metersToLabel(m: number): string {
  if (m < 1000) return `${m} m`
  return `${(m / 1000).toFixed(1)} km`
}

export function LocationRandomizer(): React.JSX.Element {
  const [radius, setRadius] = useState(MIN_RADIUS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<{ fuzzRadius: number } | null>('/location/me')
      .then((loc) => {
        if (loc?.fuzzRadius) setRadius(Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, loc.fuzzRadius)))
      })
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoaded(true))
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = Number(e.target.value)
    setRadius(val)
    setSaved(false)

    if (saveDebounce.current) clearTimeout(saveDebounce.current)
    saveDebounce.current = setTimeout(async () => {
      setSaving(true)
      try {
        await api.patch('/location/fuzz-radius', { fuzzRadius: val })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch { /* non-fatal */ } finally {
        setSaving(false)
      }
    }, 600)
  }, [])

  const pct = ((radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold">Location Randomizer</p>
          <p className="text-xs text-muted-foreground">How much to blur your position on the map</p>
        </div>
        {saving && (
          <div className="ml-auto w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        )}
        {saved && !saving && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ml-auto text-xs text-emerald-500 font-medium"
          >
            Saved
          </motion.span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
          <span>less</span>
          <span className="text-foreground font-semibold text-sm">{metersToLabel(radius)}</span>
          <span>more</span>
        </div>

        <div className="relative">
          <input
            type="range"
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            step={50}
            value={radius}
            onChange={handleChange}
            disabled={!loaded}
            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)`,
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Others see you within a ~{metersToLabel(radius)} radius · minimum {metersToLabel(MIN_RADIUS)}
        </p>
      </div>
    </div>
  )
}
