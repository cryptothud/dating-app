'use client'

import Link from 'next/link'

interface PremiumGateProps {
  feature: string
  tier?: 'premium' | 'premium_plus'
  children: React.ReactNode
  locked: boolean
}

export function PremiumGate({ feature, tier = 'premium', locked, children }: PremiumGateProps) {
  if (!locked) return <>{children}</>

  const tierLabel = tier === 'premium_plus' ? 'Premium+' : 'Premium'
  const price = tier === 'premium_plus' ? '$19.99/mo' : '$9.99/mo'

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">{children}</div>
      <div className="bg-background/80 rounded-inherit absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center backdrop-blur-sm">
        <div className="mb-2 text-2xl">🔒</div>
        <p className="text-foreground mb-1 text-sm font-semibold">
          {feature} is {tierLabel}
        </p>
        <p className="text-muted-foreground mb-4 text-xs">
          {tierLabel} — {price}
        </p>
        <Link
          href="/upgrade"
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
        >
          Upgrade to {tierLabel}
        </Link>
      </div>
    </div>
  )
}

interface PremiumBadgeProps {
  tier?: 'premium' | 'premium_plus'
  className?: string
}

export function PremiumBadge({ tier = 'premium', className = '' }: PremiumBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        tier === 'premium_plus'
          ? 'bg-amber-500/15 text-amber-400'
          : 'bg-purple-500/15 text-purple-400',
        className,
      ].join(' ')}
    >
      {tier === 'premium_plus' ? 'Premium+' : 'Premium'}
    </span>
  )
}
