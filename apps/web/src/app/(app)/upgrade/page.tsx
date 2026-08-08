'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { billing } from '@/lib/billing'

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: '$0', annual: '$0' },
    color: 'border-border',
    badge: null,
    badgeColor: '',
    features: [
      'Browse the map',
      'View full profiles',
      'Unlimited 1:1 DMs',
      'Basic filters',
      'Safety Date Mode',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: { monthly: '$9.99', annual: '$59.99' },
    color: 'border-purple-500/60',
    badge: 'Most popular',
    badgeColor: 'bg-purple-600 text-white',
    features: [
      'Everything in Free',
      'Group & event chats',
      'Voice notes',
      'Read receipts',
      'Incognito mode',
      'Create events',
      'Seen in the Wild reveal',
      '1 boost/week',
    ],
  },
  {
    id: 'premium_plus',
    name: 'Premium+',
    price: { monthly: '$19.99', annual: '$119.99' },
    color: 'border-amber-500/60',
    badge: 'Best value',
    badgeColor: 'bg-amber-500 text-black',
    features: [
      'Everything in Premium',
      'Profile viewers',
      '3 boosts/week',
      'Travel mode',
      'Profile highlight',
      'Unlimited match revives',
    ],
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [activeTier, setActiveTier] = useState(1)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isDragging = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX
    touchStartY.current = e.touches[0]!.clientY
    isDragging.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = Math.abs(e.touches[0]!.clientX - touchStartX.current)
    const dy = Math.abs(e.touches[0]!.clientY - touchStartY.current)
    if (dx > dy && dx > 8) isDragging.current = true
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null) return
    const dx = e.changedTouches[0]!.clientX - touchStartX.current
    if (Math.abs(dx) < 40) return
    if (dx < 0 && activeTier < TIERS.length - 1) setActiveTier((t) => t + 1)
    if (dx > 0 && activeTier > 0) setActiveTier((t) => t - 1)
    touchStartX.current = null
    isDragging.current = false
  }

  async function subscribe(tierId: string) {
    if (tierId === 'free') return
    setLoading(tierId)
    setError('')
    try {
      const { url } = await billing.createCheckout(tierId, annual ? 'annual' : 'monthly')
      window.location.href = url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-1 text-center">
          <h1 className="font-display text-foreground text-3xl font-bold">Upgrade CRUSH</h1>
          <p className="text-muted-foreground text-sm">
            Unlock group chats, voice notes, boosts, and more.
          </p>
        </div>

        {/* Annual toggle — save badge always visible */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setAnnual(!annual)}
            className={[
              'flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition-colors',
              annual
                ? 'border-purple-500 bg-purple-600 text-white'
                : 'bg-background text-muted-foreground border-border hover:text-foreground',
            ].join(' ')}
          >
            <span>Annual billing</span>
            <span
              className={[
                'rounded-full px-2 py-0.5 text-xs transition-colors',
                annual ? 'bg-white/20 text-white' : 'bg-purple-600/15 text-purple-500',
              ].join(' ')}
            >
              Save ~50%
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Mobile: swipeable cards */}
        <div className="md:hidden">
          {/* Tier tabs */}
          <div className="border-border bg-muted/40 mb-5 flex gap-1 rounded-xl border p-1">
            {TIERS.map((tier, i) => (
              <button
                key={tier.id}
                onClick={() => setActiveTier(i)}
                className={[
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                  activeTier === i
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {tier.name}
              </button>
            ))}
          </div>

          {/* Swipeable card track */}
          <div
            className="overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(calc(-${activeTier * 100}%))` }}
            >
              {TIERS.map((tier) => (
                <div key={tier.id} className="relative flex w-full shrink-0 flex-col px-px pt-4">
                  {tier.badge && (
                    <span
                      className={[
                        'absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold',
                        tier.badgeColor,
                      ].join(' ')}
                    >
                      {tier.badge}
                    </span>
                  )}
                  <div
                    className={[
                      'bg-card flex flex-1 flex-col rounded-2xl border p-6',
                      tier.color,
                    ].join(' ')}
                  >
                    <div className="mb-5">
                      <h2 className="font-display text-foreground text-xl font-bold">
                        {tier.name}
                      </h2>
                      <div className="mt-1">
                        <span className="text-foreground text-3xl font-bold">
                          {annual ? tier.price.annual : tier.price.monthly}
                        </span>
                        {tier.id !== 'free' && (
                          <span className="text-muted-foreground ml-1 text-sm">
                            /{annual ? 'yr' : 'mo'}
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="mb-6 flex-1 space-y-2.5">
                      {tier.features.map((f) => (
                        <li
                          key={f}
                          className="text-muted-foreground flex items-center gap-2.5 text-sm"
                        >
                          <span className="shrink-0 text-purple-400">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => void subscribe(tier.id)}
                      disabled={tier.id === 'free' || loading !== null}
                      className={[
                        'w-full rounded-xl py-3 text-sm font-semibold transition-colors',
                        tier.id === 'free'
                          ? 'bg-muted text-muted-foreground cursor-default'
                          : tier.id === 'premium'
                            ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60'
                            : 'bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-60',
                      ].join(' ')}
                    >
                      {tier.id === 'free'
                        ? 'Current plan'
                        : loading === tier.id
                          ? 'Redirecting…'
                          : `Get ${tier.name}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="mt-4 flex justify-center gap-2">
            {TIERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTier(i)}
                className={[
                  'rounded-full transition-all duration-200',
                  i === activeTier ? 'bg-primary h-1.5 w-5' : 'bg-border h-1.5 w-1.5',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid md:grid-cols-3 md:gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={['bg-card relative flex flex-col rounded-2xl border p-6', tier.color].join(
                ' ',
              )}
            >
              {tier.badge && (
                <div
                  className={[
                    'absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold',
                    tier.badgeColor,
                  ].join(' ')}
                >
                  {tier.badge}
                </div>
              )}
              <div className="mb-4">
                <h2 className="font-display text-foreground text-lg font-bold">{tier.name}</h2>
                <div className="mt-1">
                  <span className="text-foreground text-2xl font-bold">
                    {annual ? tier.price.annual : tier.price.monthly}
                  </span>
                  {tier.id !== 'free' && (
                    <span className="text-muted-foreground ml-1 text-sm">
                      /{annual ? 'yr' : 'mo'}
                    </span>
                  )}
                </div>
              </div>
              <ul className="mb-6 flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="text-muted-foreground flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-purple-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => void subscribe(tier.id)}
                disabled={tier.id === 'free' || loading !== null}
                className={[
                  'w-full rounded-xl py-2.5 text-sm font-semibold transition-colors',
                  tier.id === 'free'
                    ? 'bg-muted text-muted-foreground cursor-default'
                    : tier.id === 'premium'
                      ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60'
                      : 'bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-60',
                ].join(' ')}
              >
                {tier.id === 'free'
                  ? 'Current plan'
                  : loading === tier.id
                    ? 'Redirecting…'
                    : `Get ${tier.name}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">
          Subscriptions renew automatically. Cancel anytime in 2 taps from Settings — no dark
          patterns.
        </p>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
