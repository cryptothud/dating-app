'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { YearPicker, CURRENT_YEAR, DEFAULT_YEAR } from '@/components/ui/year-picker'
import { TurnstileWidget } from './TurnstileWidget'
import { api, ApiRequestError } from '@/lib/api'

const MIN_AGE = 18
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  onVerified: () => void
  onGoBack: () => void
}

export function AgeGateModal({ onVerified, onGoBack }: Props): React.JSX.Element {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR)
  const [birthMonth, setBirthMonth] = useState(0)
  const [birthDay, setBirthDay] = useState(0)
  const [step, setStep] = useState<'age' | 'captcha'>('age')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  // Cloudflare's client-side error code, or null when the challenge is healthy.
  const [turnstileError, setTurnstileError] = useState<string | null>(null)
  // Bumping this remounts the widget, which is how a challenge gets reset.
  const [widgetNonce, setWidgetNonce] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const isOldEnough = (() => {
    if (!birthMonth || !birthDay) return false
    if (selectedYear > CURRENT_YEAR - MIN_AGE) return false
    const eighteenthBday = new Date(selectedYear + MIN_AGE, birthMonth - 1, birthDay)
    return new Date() >= eighteenthBday
  })()

  const showAgeError = (() => {
    if (selectedYear === DEFAULT_YEAR) return false
    if (selectedYear > CURRENT_YEAR - MIN_AGE) return true
    if (birthMonth > 0 && birthDay > 0 && !isOldEnough) return true
    return false
  })()

  const maxDay = birthMonth ? new Date(selectedYear, birthMonth, 0).getDate() : 31

  const handleYearChange = (year: number): void => {
    setSelectedYear(year)
    if (birthMonth) {
      const newMax = new Date(year, birthMonth, 0).getDate()
      if (birthDay > newMax) setBirthDay(0)
    }
  }

  // With no sitekey there is no challenge to solve. The API applies the same bypass in
  // development and refuses it in production, so this cannot open the gate in prod.
  useEffect(() => {
    if (step === 'captcha' && !SITEKEY) setTurnstileToken('dev-bypass')
  }, [step, SITEKEY])

  const resetChallenge = (): void => {
    setTurnstileToken(null)
    setTurnstileError(null)
    setWidgetNonce((n) => n + 1)
  }

  // Cloudflare groups codes into families: 110xxx means the widget is misconfigured
  // (wrong sitekey, or this hostname is not on its allow-list) and retrying cannot help,
  // while 300xxx/600xxx are challenge failures that often clear on a second attempt.
  const isConfigError = turnstileError?.startsWith('110') ?? false

  const handleEnter = async (): Promise<void> => {
    if (!turnstileToken || verifying) return
    setVerifying(true)
    setVerifyError(null)
    try {
      await api.post('/age-gate/verify', { token: turnstileToken })
      onVerified()
    } catch (err) {
      setVerifyError(
        err instanceof ApiRequestError ? err.message : 'Verification failed. Please try again.',
      )
      // Turnstile tokens are single-use, so a rejected attempt needs a fresh challenge.
      resetChallenge()
    } finally {
      setVerifying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-border mx-auto w-full max-w-sm overflow-hidden rounded-3xl border shadow-xl dark:border-white/10 dark:bg-black/45 dark:shadow-2xl dark:backdrop-blur-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait">
        {step === 'age' ? (
          <motion.div
            key="age"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -16 }}
            className="space-y-4 p-5"
          >
            <div className="space-y-1 text-center">
              <div className="mb-2 text-3xl">🎂</div>
              <h2 className="font-display text-foreground text-lg font-bold">Age Verification</h2>
              <p className="text-muted-foreground text-xs leading-snug">
                CRUSH contains adult content. We need to verify your age.
              </p>
            </div>

            <div>
              <p className="text-foreground mb-3 text-center text-xs font-semibold">
                When were you born?
              </p>
              <YearPicker value={selectedYear} onChange={handleYearChange} />
            </div>

            <div className="flex gap-2">
              <select
                value={birthMonth || ''}
                onChange={(e) => {
                  setBirthMonth(Number(e.target.value))
                  setBirthDay(0)
                }}
                className="text-foreground focus:ring-ring dark:focus:ring-primary/60 h-10 flex-1 rounded-xl border border-black/[0.08] bg-black/5 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-1 dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-white"
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={birthDay || ''}
                onChange={(e) => setBirthDay(Number(e.target.value))}
                disabled={!birthMonth}
                className="text-foreground focus:ring-ring dark:focus:ring-primary/60 h-10 w-24 rounded-xl border border-black/[0.08] bg-black/5 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-1 disabled:opacity-40 dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-white"
              >
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {showAgeError && (
              <p className="text-destructive text-center text-sm font-semibold">
                You must be 18 or older to enter CRUSH.
              </p>
            )}

            <p className="text-center text-xs font-medium text-amber-500">
              This cannot be changed later.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onGoBack}
                className="border-border text-muted-foreground hover:bg-muted h-11 flex-1 rounded-xl border text-sm font-medium transition-colors"
              >
                Go back
              </button>
              <button
                onClick={() => setStep('captcha')}
                disabled={!isOldEnough}
                className="bg-primary flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4 fill-none stroke-current"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="captcha"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 p-5"
          >
            <div className="space-y-1 text-center">
              <div className="mb-2 text-3xl">🤖</div>
              <h2 className="font-display text-foreground text-lg font-bold">One more step</h2>
              <p className="text-muted-foreground text-sm">
                Confirming you&apos;re not a bot before you explore the map.
              </p>
            </div>

            <div className="flex min-h-[70px] flex-col items-center justify-center gap-2">
              {!SITEKEY ? (
                <div className="bg-muted border-border text-muted-foreground flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0 fill-emerald-500">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verification bypassed (dev mode)
                </div>
              ) : (
                <>
                  <TurnstileWidget
                    key={widgetNonce}
                    sitekey={SITEKEY}
                    onToken={(token) => {
                      setTurnstileToken(token)
                      setTurnstileError(null)
                    }}
                    onError={(code) => {
                      setTurnstileToken(null)
                      setTurnstileError(code)
                    }}
                    onExpire={() => setTurnstileToken(null)}
                  />
                  {turnstileError && (
                    <div className="space-y-1.5 text-center">
                      <p className="text-destructive text-sm">
                        {isConfigError
                          ? "Verification isn't set up correctly for this site."
                          : 'Verification failed. Please try again.'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Cloudflare error {turnstileError}
                      </p>
                      {!isConfigError && (
                        <button onClick={resetChallenge} className="text-primary text-sm underline">
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {verifyError && <p className="text-destructive text-center text-sm">{verifyError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setVerifyError(null)
                  resetChallenge()
                  setStep('age')
                }}
                className="border-border text-muted-foreground hover:bg-muted h-11 flex-1 rounded-xl border text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => void handleEnter()}
                disabled={!turnstileToken || verifying}
                className="bg-primary h-11 flex-1 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifying ? 'Verifying…' : 'Enter CRUSH'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 pb-4 text-center">
        <p className="text-muted-foreground text-xs">
          You must be 18+. By continuing you agree to our{' '}
          <a href="/terms" className="hover:text-foreground underline">
            Terms
          </a>
          {' and '}
          <a href="/privacy" className="hover:text-foreground underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </motion.div>
  )
}
