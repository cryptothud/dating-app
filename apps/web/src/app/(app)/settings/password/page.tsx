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
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500']
  return { score, label: labels[score] ?? '', color: colors[score] ?? '' }
}

const INPUT_CLS = 'w-full h-11 px-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all'

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
    if (next !== confirm) { setError('Passwords do not match'); return }
    if (strength.score < 2) { setError('Password is too weak'); return }
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
      <div className="p-5 space-y-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4L6 8l4 4" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold font-display text-foreground">Change Password</h1>
        </div>

        {success ? (
          <div className="rounded-2xl bg-green-500/10 border border-green-500/30 p-4 text-center">
            <p className="text-sm font-semibold text-green-500">Password updated!</p>
            <p className="text-xs text-muted-foreground mt-1">Redirecting to settings…</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current password</label>
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">New password</label>
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
                    <p className="text-[11px] text-muted-foreground">{strength.label}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm new password</label>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className={`${INPUT_CLS} ${mismatch ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
                autoComplete="new-password"
                required
              />
              {mismatch && <p className="text-[11px] text-red-400 mt-1">Passwords don't match</p>}
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || mismatch || !current || !next || !confirm}
              className="w-full h-11 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Updating…
                </span>
              ) : 'Update Password'}
            </button>

            <p className="text-center text-xs text-muted-foreground">
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
