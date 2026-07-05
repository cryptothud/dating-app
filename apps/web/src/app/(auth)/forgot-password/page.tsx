'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/auth'

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!email) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-xl text-foreground mb-2">Check your inbox</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve sent a reset link. Check your spam folder if you don&apos;t see it in a minute.
        </p>
        <Link href="/" className="mt-6 block text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="font-display font-bold text-2xl text-foreground mb-1">Forgot password?</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full h-11 px-4 rounded-xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full h-11 rounded-2xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Remember your password?{' '}
        <Link href="/" className="text-primary font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
