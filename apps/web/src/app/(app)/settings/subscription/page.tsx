'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { billing, type SubscriptionStatus } from '@/lib/billing'

const TIER_LABELS: Record<string, string> = {
  premium: 'Premium',
  premium_plus: 'Premium+',
}

function SubscriptionContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelStep, setCancelStep] = useState<'idle' | 'confirm'>('idle')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [error, setError] = useState('')
  const billingSuccess = params.get('billing') === 'success'

  useEffect(() => {
    billing.getSubscription()
      .then(setSub)
      .catch(() => setSub({ active: false, tier: null, expiresAt: null, cancelledAt: null }))
      .finally(() => setLoading(false))
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    setError('')
    try {
      const { url } = await billing.createPortal()
      window.location.href = url
    } catch {
      setError('Could not open billing portal. Please try again.')
      setPortalLoading(false)
    }
  }

  async function confirmCancel() {
    setCancelLoading(true)
    setError('')
    try {
      await billing.cancel()
      setSub((prev) => prev ? { ...prev, cancelledAt: new Date().toISOString() } : prev)
      setCancelStep('idle')
    } catch {
      setError('Failed to cancel. Please try again or contact support.')
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-5 flex justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const tierLabel = sub?.tier ? (TIER_LABELS[sub.tier] ?? sub.tier) : null
  const expiresFormatted = sub?.expiresAt
    ? new Date(sub.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg viewBox="0 0 16 16" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 4L6 8l4 4" />
          </svg>
        </button>
        <h1 className="text-xl font-bold font-display text-foreground">Subscription</h1>
      </div>

      {billingSuccess && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
          Payment successful! Your subscription is now active.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Current plan</p>
            <p className="text-lg font-display font-bold text-foreground mt-0.5">
              {sub?.active && tierLabel ? tierLabel : 'Free'}
            </p>
          </div>
          {sub?.active && (
            <span className="text-xs font-semibold bg-purple-500/15 text-purple-400 rounded-full px-3 py-1">
              Active
            </span>
          )}
        </div>

        {sub?.active && expiresFormatted && (
          <p className="text-sm text-muted-foreground">
            {sub.cancelledAt
              ? `Access until ${expiresFormatted} — subscription cancelled`
              : `Renews ${expiresFormatted}`}
          </p>
        )}

        {!sub?.active && (
          <p className="text-sm text-muted-foreground">
            Upgrade to unlock group chats, voice notes, profile boosts, and more.
          </p>
        )}
      </div>

      {/* Actions */}
      {sub?.active ? (
        <div className="space-y-3">
          <button
            onClick={() => void openPortal()}
            disabled={portalLoading}
            className="w-full h-11 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors"
          >
            {portalLoading ? 'Opening…' : 'Manage Billing'}
          </button>

          {!sub.cancelledAt && cancelStep === 'idle' && (
            <button
              onClick={() => setCancelStep('confirm')}
              className="w-full h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Cancel subscription
            </button>
          )}

          {!sub.cancelledAt && cancelStep === 'confirm' && (
            <div className="rounded-2xl bg-card border border-destructive/30 p-5 space-y-3">
              <p className="text-sm text-foreground font-medium">Cancel your subscription?</p>
              <p className="text-sm text-muted-foreground">
                You'll keep access until {expiresFormatted ?? 'your billing date'}. No further charges.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCancelStep('idle')}
                  disabled={cancelLoading}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Keep plan
                </button>
                <button
                  onClick={() => void confirmCancel()}
                  disabled={cancelLoading}
                  className="flex-1 h-10 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-colors"
                >
                  {cancelLoading ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/upgrade"
          className="block w-full h-11 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center"
        >
          Upgrade to Premium
        </Link>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Questions? <a href="mailto:support@crush.app" className="text-purple-400 hover:underline">Contact support</a>
      </p>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionContent />
    </Suspense>
  )
}
