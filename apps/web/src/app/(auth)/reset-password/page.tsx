'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/auth'
import { PasswordInput } from '@/components/ui/password-input'

function ResetPasswordForm(): React.JSX.Element {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.')
  }, [token])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      setTimeout(() => {
        router.push('/')
      }, 2500)
    } catch {
      setError('This link is invalid or has expired. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 fill-none stroke-emerald-500"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-display text-foreground mb-2 text-xl font-bold">Password updated</h1>
        <p className="text-muted-foreground text-sm">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="font-display text-foreground mb-1 text-2xl font-bold">Set new password</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Choose a strong password — at least 8 characters.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-foreground mb-1.5 block text-xs font-semibold">New password</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            autoFocus
            disabled={!token}
            className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-foreground mb-1.5 block text-xs font-semibold">
            Confirm password
          </label>
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            required
            disabled={!token}
            className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1 disabled:opacity-50"
          />
        </div>

        {error && <p className="text-destructive text-xs font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading || !token || !password || !confirm}
          className="bg-primary h-11 w-full rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="text-muted-foreground mt-5 text-center text-xs">
        <Link href="/forgot-password" className="text-primary font-medium hover:underline">
          Request a new link
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
