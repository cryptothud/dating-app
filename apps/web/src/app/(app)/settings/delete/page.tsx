'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { authApi } from '@/lib/auth'

export default function DeleteAccountPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const CONFIRM_PHRASE = 'delete my account'

  const handleDelete = async () => {
    if (confirm.toLowerCase() !== CONFIRM_PHRASE) {
      setError(`Type "${CONFIRM_PHRASE}" to confirm`)
      return
    }
    setDeleting(true)
    setError('')
    try {
      await api.del('/users/me')
      await authApi.logout().catch(() => {})
      window.location.href = '/?deleted=1'
    } catch {
      setError('Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-md space-y-6 p-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 2 ? setStep(1) : router.push('/settings'))}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="font-display text-foreground text-xl font-bold">Delete Account</h1>
        </div>

        {step === 1 && (
          <>
            {/* Warning card */}
            <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-2xl border p-5">
              <div className="flex items-center gap-3">
                <div className="bg-destructive/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <svg
                    viewBox="0 0 24 24"
                    className="stroke-destructive h-5 w-5 fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <p className="text-foreground text-sm font-semibold">This is permanent</p>
              </div>
              <ul className="text-muted-foreground space-y-1.5 text-sm">
                {[
                  'Your profile and photos will be deleted immediately',
                  'All your conversations and messages will be lost',
                  'Your subscription will be cancelled with no refund',
                  'You cannot recover your account after 30 days',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg
                      viewBox="0 0 16 16"
                      className="stroke-destructive/60 mt-0.5 h-4 w-4 shrink-0 fill-none"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    >
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 5v3.5M8 10.5h.01" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStep(2)}
                className="border-destructive/50 text-destructive hover:bg-destructive/5 h-11 w-full rounded-xl border text-sm font-semibold transition-colors"
              >
                I understand, continue
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="bg-muted text-foreground hover:bg-muted/80 h-11 w-full rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-card border-border space-y-4 rounded-2xl border p-5">
              <p className="text-muted-foreground text-sm leading-relaxed">
                To permanently delete your account, type{' '}
                <span className="text-foreground font-semibold">delete my account</span> below.
              </p>
              <input
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setError('')
                }}
                placeholder="delete my account"
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-destructive/40 h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1"
                autoComplete="off"
                spellCheck={false}
              />
              {error && <p className="text-destructive text-xs">{error}</p>}
            </div>

            <button
              onClick={() => void handleDelete()}
              disabled={deleting || confirm.toLowerCase() !== CONFIRM_PHRASE}
              className="bg-destructive h-11 w-full rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {deleting ? 'Deleting…' : 'Permanently Delete Account'}
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="bg-muted text-foreground hover:bg-muted/80 h-11 w-full rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
