'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { PasswordInput } from '@/components/ui/password-input'

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']
  const colors = [
    '',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-emerald-500',
  ]
  return { score, label: labels[score] ?? '', color: colors[score] ?? '' }
}

const INPUT_CLS =
  'w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all'

export default function ChangePasswordPage(): React.JSX.Element {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const strength = getStrength(next)
  const mismatch = confirm.length > 0 && next !== confirm

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (next !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (strength.score < 2) {
      setError('Password is too weak')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.patch('/auth/password', { currentPassword: current, newPassword: next })
      setSuccess(true)
      setTimeout(() => router.push('/settings'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-sm space-y-6 p-5">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
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
          </Link>
          <h1 className="font-display text-foreground text-xl font-bold">Change Password</h1>
        </div>

        {success ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-green-500">Password updated!</p>
            <p className="text-muted-foreground mt-1 text-xs">Redirecting to settings…</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Current password
              </label>
              <PasswordInput
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Enter current password"
                className={INPUT_CLS}
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                New password
              </label>
              <PasswordInput
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="At least 8 characters"
                className={INPUT_CLS}
                autoComplete="new-password"
                required
              />
              {next.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-muted'}`}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <p className="text-muted-foreground text-[11px]">{strength.label}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Confirm new password
              </label>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className={`${INPUT_CLS} ${mismatch ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
                autoComplete="new-password"
                required
              />
              {mismatch && (
                <p className="mt-1 text-[11px] text-red-400">Passwords don&apos;t match</p>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || mismatch || !current || !next || !confirm}
              className="bg-primary h-11 w-full rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating…
                </span>
              ) : (
                'Update Password'
              )}
            </button>

            <p className="text-muted-foreground text-center text-xs">
              Forgot your current password?{' '}
              <Link href="/forgot-password" className="text-primary hover:underline">
                Reset it
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
