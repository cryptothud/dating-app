'use client'

import { useEffect, useState } from 'react'
import { billing, type SubscriptionStatus } from '@/lib/billing'

const FREE: SubscriptionStatus = { active: false, tier: null, expiresAt: null, cancelledAt: null }

export function useSubscription(enabled = true) {
  const [status, setStatus] = useState<SubscriptionStatus>(FREE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    billing.getSubscription()
      .then(setStatus)
      .catch(() => setStatus(FREE))
      .finally(() => setLoading(false))
  }, [enabled])

  const isPremium = status.active && (status.tier === 'premium' || status.tier === 'premium_plus')
  const isPremiumPlus = status.active && status.tier === 'premium_plus'

  return { status, loading, isPremium, isPremiumPlus }
}
