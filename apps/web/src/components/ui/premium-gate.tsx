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
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-inherit z-10 p-4 text-center">
        <div className="text-2xl mb-2">🔒</div>
        <p className="text-sm font-semibold text-foreground mb-1">{feature} is {tierLabel}</p>
        <p className="text-xs text-muted-foreground mb-4">{tierLabel} — {price}</p>
        <Link
          href="/upgrade"
          className="rounded-xl bg-purple-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-purple-700 transition-colors"
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
    <span className={[
      'inline-flex items-center text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5',
      tier === 'premium_plus'
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-purple-500/15 text-purple-400',
      className,
    ].join(' ')}>
      {tier === 'premium_plus' ? 'Premium+' : 'Premium'}
    </span>
  )
}
