'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { MapFilters } from '@dating-app/types'

const LOOKING_FOR_OPTIONS = ['casual', 'relationship', 'friendship', 'hookup', 'dating']
const BODY_TYPE_OPTIONS = ['slim', 'athletic', 'average', 'muscular', 'curvy', 'full']
const INTERESTS_OPTIONS = [
  'Hiking', 'Gaming', 'Cooking', 'Travel', 'Music', 'Art', 'Fitness',
  'Reading', 'Movies', 'Photography', 'Dancing', 'Yoga', 'Sports', 'Tech',
  'Fashion', 'Foodies', 'Outdoors', 'Nightlife', 'Pets', 'Wellness',
]

interface Props {
  filters: MapFilters
  onChange: (f: MapFilters) => void
  onClose: () => void
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export function FilterPanel({ filters, onChange, onClose }: Props): React.JSX.Element {
  const [local, setLocal] = useState<MapFilters>(filters)

  const hasActive =
    local.ageMin !== undefined || local.ageMax !== undefined ||
    (local.lookingFor && local.lookingFor.length > 0) ||
    local.activelyOnly || local.bodyType ||
    (local.interests && local.interests.length > 0)

  function apply(): void {
    onChange(local)
    onClose()
  }

  function reset(): void {
    const cleared: MapFilters = {}
    setLocal(cleared)
    onChange(cleared)
    onClose()
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 350 }}
      className="absolute inset-y-0 right-0 z-[50] w-72 flex flex-col bg-white dark:bg-[hsl(260_28%_5%/0.98)] dark:backdrop-blur-xl border-l border-border shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-bold font-display text-foreground">Filters</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Close filters"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Actively looking */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-foreground">Actively looking only</p>
            <p className="text-xs text-muted-foreground mt-0.5">Show users with pulse activated</p>
          </div>
          <button
            role="switch"
            aria-checked={local.activelyOnly ?? false}
            onClick={() => setLocal((p) => ({ ...p, activelyOnly: !p.activelyOnly }))}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              local.activelyOnly ? 'bg-primary' : 'bg-muted',
            ].join(' ')}
          >
            <span className={[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              local.activelyOnly ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')} />
          </button>
        </label>

        {/* Age range */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Age range</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={18}
              max={local.ageMax ?? 100}
              placeholder="Min"
              value={local.ageMin ?? ''}
              onChange={(e) => setLocal((p) => ({ ...p, ageMin: e.target.value ? Math.max(18, Math.min(Number(e.target.value), p.ageMax ?? 100)) : undefined }))}
              className="w-full h-9 px-3 rounded-xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <input
              type="number"
              min={local.ageMin ?? 18}
              max={100}
              placeholder="Max"
              value={local.ageMax ?? ''}
              onChange={(e) => setLocal((p) => ({ ...p, ageMax: e.target.value ? Math.max(p.ageMin ?? 18, Math.min(Number(e.target.value), 100)) : undefined }))}
              className="w-full h-9 px-3 rounded-xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Looking for */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Looking for</p>
          <div className="flex flex-wrap gap-2">
            {LOOKING_FOR_OPTIONS.map((opt) => {
              const active = local.lookingFor?.includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => setLocal((p) => ({
                    ...p,
                    lookingFor: toggle(p.lookingFor ?? [], opt),
                  }))}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors border',
                    active
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                  ].join(' ')}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body type */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Body type</p>
          <div className="flex flex-wrap gap-2">
            {BODY_TYPE_OPTIONS.map((opt) => {
              const active = local.bodyType === opt
              return (
                <button
                  key={opt}
                  onClick={() => setLocal((p) => ({ ...p, bodyType: active ? undefined : opt }))}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors border',
                    active
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                  ].join(' ')}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Interests */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS_OPTIONS.map((opt) => {
              const active = local.interests?.includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => setLocal((p) => ({
                    ...p,
                    interests: toggle(p.interests ?? [], opt),
                  }))}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                    active
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                  ].join(' ')}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex gap-2">
        {hasActive && (
          <button
            onClick={reset}
            className="flex-1 h-10 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Reset
          </button>
        )}
        <button
          onClick={apply}
          className="flex-1 h-10 rounded-2xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Apply
        </button>
      </div>
    </motion.div>
  )
}
