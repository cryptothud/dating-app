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
    billing
      .getSubscription()
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
      setSub((prev) => (prev ? { ...prev, cancelledAt: new Date().toISOString() } : prev))
      setCancelStep('idle')
    } catch {
      setError('Failed to cancel. Please try again or contact support.')
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-5 py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  const tierLabel = sub?.tier ? (TIER_LABELS[sub.tier] ?? sub.tier) : null
  const expiresFormatted = sub?.expiresAt
    ? new Date(sub.expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="h-full space-y-5 overflow-y-auto p-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-5 w-5 fill-none stroke-current"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 4L6 8l4 4" />
          </svg>
        </button>
        <h1 className="font-display text-foreground text-xl font-bold">Subscription</h1>
      </div>

      {billingSuccess && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Payment successful! Your subscription is now active.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-card border-border space-y-4 rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
              Current plan
            </p>
            <p className="font-display text-foreground mt-0.5 text-lg font-bold">
              {sub?.active && tierLabel ? tierLabel : 'Free'}
            </p>
          </div>
          {sub?.active && (
            <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-400">
              Active
            </span>
          )}
        </div>

        {sub?.active && expiresFormatted && (
          <p className="text-muted-foreground text-sm">
            {sub.cancelledAt
              ? `Access until ${expiresFormatted} — subscription cancelled`
              : `Renews ${expiresFormatted}`}
          </p>
        )}

        {!sub?.active && (
          <p className="text-muted-foreground text-sm">
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
            className="h-11 w-full rounded-xl bg-purple-600 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
          >
            {portalLoading ? 'Opening…' : 'Manage Billing'}
          </button>

          {!sub.cancelledAt && cancelStep === 'idle' && (
            <button
              onClick={() => setCancelStep('confirm')}
              className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 h-11 w-full rounded-xl border text-sm font-medium transition-colors"
            >
              Cancel subscription
            </button>
          )}

          {!sub.cancelledAt && cancelStep === 'confirm' && (
            <div className="bg-card border-destructive/30 space-y-3 rounded-2xl border p-5">
              <p className="text-foreground text-sm font-medium">Cancel your subscription?</p>
              <p className="text-muted-foreground text-sm">
                You&apos;ll keep access until {expiresFormatted ?? 'your billing date'}. No further
                charges.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCancelStep('idle')}
                  disabled={cancelLoading}
                  className="border-border text-muted-foreground hover:text-foreground h-10 flex-1 rounded-xl border text-sm font-medium transition-colors"
                >
                  Keep plan
                </button>
                <button
                  onClick={() => void confirmCancel()}
                  disabled={cancelLoading}
                  className="bg-destructive hover:bg-destructive/90 h-10 flex-1 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
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
          className="block flex h-11 w-full items-center justify-center rounded-xl bg-purple-600 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
        >
          Upgrade to Premium
        </Link>
      )}

      <p className="text-muted-foreground text-center text-xs">
        Questions?{' '}
        <a href="mailto:support@crush.app" className="text-purple-400 hover:underline">
          Contact support
        </a>
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
