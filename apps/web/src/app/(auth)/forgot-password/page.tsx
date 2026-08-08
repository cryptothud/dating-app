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
        <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
          <svg
            viewBox="0 0 24 24"
            className="stroke-primary h-6 w-6 fill-none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="font-display text-foreground mb-2 text-xl font-bold">Check your inbox</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve
          sent a reset link. Check your spam folder if you don&apos;t see it in a minute.
        </p>
        <Link href="/" className="text-primary mt-6 block text-sm font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="font-display text-foreground mb-1 text-2xl font-bold">Forgot password?</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-foreground mb-1.5 block text-xs font-semibold">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-1"
          />
        </div>

        {error && <p className="text-destructive text-xs font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email}
          className="bg-primary h-11 w-full rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-muted-foreground mt-5 text-center text-xs">
        Remember your password?{' '}
        <Link href="/" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
