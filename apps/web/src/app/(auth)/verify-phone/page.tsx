'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { authApi } from '@/lib/auth'
import { ApiRequestError } from '@/lib/api'

const CODE_LENGTH = 6

export default function VerifyPhonePage(): React.JSX.Element {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(30)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    void authApi.sendOtp().catch(() => null)
    inputRefs.current[0]?.focus()

    // WebOTP API — auto-fills the code on Android Chrome.
    // iOS uses autocomplete="one-time-code" on the input (QuickType bar suggestion).
    if (!('OTPCredential' in window)) return
    const ac = new AbortController()
    void navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
      .then((otp) => {
        if (otp && 'code' in otp) {
          const code = (otp as { code: string }).code.replace(/\D/g, '').slice(0, CODE_LENGTH)
          const next = Array(CODE_LENGTH).fill('')
          for (let i = 0; i < code.length; i++) next[i] = code[i] ?? ''
          setDigits(next)
          if (code.length === CODE_LENGTH) void submitCode(code)
        }
      })
      .catch(() => null)
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  function handleDigit(index: number, value: string): void {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (next.every((d) => d !== '')) void submitCode(next.join(''))
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent): void {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent): void {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    const next = Array(CODE_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i] ?? ''
    setDigits(next)
    if (pasted.length === CODE_LENGTH) void submitCode(pasted)
  }

  async function submitCode(code: string): Promise<void> {
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const me = await authApi.me()
      await authApi.verifyOtp({ phone: me.phone, code })
      router.push('/onboarding')
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Invalid code — try again')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resend(): Promise<void> {
    setError(null)
    try {
      await authApi.sendOtp()
      setResendCooldown(30)
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not resend code')
    }
  }

  const filled = digits.filter(Boolean).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-7 space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-primary" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold font-display text-foreground dark:text-white tracking-tight">
          Check your phone
        </h1>
        <p className="text-sm text-muted-foreground dark:text-white/50">
          We sent a 6-digit code via SMS
        </p>
      </div>

      {/* OTP inputs */}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isSubmitting}
            className={[
              'w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all outline-none',
              'bg-black/5 dark:bg-white/8',
              digit
                ? 'border-primary dark:border-primary/70 text-foreground dark:text-white'
                : 'border-black/8 dark:border-white/12 text-foreground dark:text-white',
              'focus:border-primary focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary/30',
              'disabled:opacity-40',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-0.5 flex-1 rounded-full transition-all duration-200',
              i < filled ? 'bg-primary' : 'bg-black/10 dark:bg-white/10',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-destructive text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Submitting state */}
      {isSubmitting && (
        <div className="flex justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Resend */}
      <div className="text-center pt-1">
        {resendCooldown > 0 ? (
          <p className="text-sm text-muted-foreground dark:text-white/40">
            Resend code in <span className="tabular-nums">{resendCooldown}s</span>
          </p>
        ) : (
          <button
            onClick={() => void resend()}
            className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
          >
            Resend code
          </button>
        )}
      </div>
    </motion.div>
  )
}
