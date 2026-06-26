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
    // Auto-send OTP on mount
    void authApi.sendOtp().catch(() => null)
    inputRefs.current[0]?.focus()
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

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (next.every((d) => d !== '')) {
      void submitCode(next.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent): void {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent): void {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    const next = [...Array(CODE_LENGTH).fill('')]
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
      router.push('/map')
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Invalid code')
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verify your phone</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code we sent you via SMS.
        </p>
      </div>

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isSubmitting}
            className="w-12 h-14 text-center text-xl font-semibold rounded-lg border border-border bg-muted focus:border-primary focus:ring-1 focus:ring-ring outline-none transition-colors disabled:opacity-50"
          />
        ))}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-destructive text-center"
        >
          {error}
        </motion.p>
      )}

      <div className="text-center">
        {resendCooldown > 0 ? (
          <p className="text-sm text-muted-foreground">Resend in {resendCooldown}s</p>
        ) : (
          <button
            onClick={() => void resend()}
            className="text-sm text-primary hover:underline"
          >
            Resend code
          </button>
        )}
      </div>
    </motion.div>
  )
}
