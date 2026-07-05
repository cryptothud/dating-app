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
      <div className="p-5 max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === 2 ? setStep(1) : router.push('/settings')}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold font-display text-foreground">Delete Account</h1>
        </div>

        {step === 1 && (
          <>
            {/* Warning card */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-destructive" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-foreground">This is permanent</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                {[
                  'Your profile and photos will be deleted immediately',
                  'All your conversations and messages will be lost',
                  'Your subscription will be cancelled with no refund',
                  'You cannot recover your account after 30 days',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 mt-0.5 fill-none stroke-destructive/60" strokeWidth="1.75" strokeLinecap="round">
                      <circle cx="8" cy="8" r="6.5" /><path d="M8 5v3.5M8 10.5h.01" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStep(2)}
                className="w-full h-11 rounded-xl border border-destructive/50 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors"
              >
                I understand, continue
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="w-full h-11 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                To permanently delete your account, type <span className="font-semibold text-foreground">delete my account</span> below.
              </p>
              <input
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError('') }}
                placeholder="delete my account"
                className="w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive/40"
                autoComplete="off"
                spellCheck={false}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <button
              onClick={() => void handleDelete()}
              disabled={deleting || confirm.toLowerCase() !== CONFIRM_PHRASE}
              className="w-full h-11 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {deleting ? 'Deleting…' : 'Permanently Delete Account'}
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="w-full h-11 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
