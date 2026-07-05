'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { YearPicker, CURRENT_YEAR, DEFAULT_YEAR } from '@/components/ui/year-picker'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

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
  const [turnstileError, setTurnstileError] = useState(false)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (step !== 'captcha') return
    if (!SITEKEY) { setTurnstileToken('dev-bypass'); return }

    let mounted = true
    let currentWidgetId: string | undefined

    const doRender = (): void => {
      if (!mounted || !turnstileRef.current || !window.turnstile) return
      // Clear any leftover widget markup from a previous render
      turnstileRef.current.innerHTML = ''
      setTurnstileError(false)
      currentWidgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: SITEKEY,
        theme: 'auto',
        callback: (token: string) => { if (mounted) { setTurnstileToken(token); setTurnstileError(false) } },
        'error-callback': () => { if (mounted) { setTurnstileToken(null); setTurnstileError(true) } },
        'expired-callback': () => { if (mounted) setTurnstileToken(null) },
      })
      if (currentWidgetId !== undefined) setWidgetId(currentWidgetId)
    }

    if (window.turnstile) {
      doRender()
    } else {
      // Use Cloudflare's recommended onload pattern — guarantees window.turnstile is ready
      const cbName = `_ts_${Math.random().toString(36).slice(2)}`
      ;(window as unknown as Record<string, unknown>)[cbName] = () => {
        delete (window as unknown as Record<string, unknown>)[cbName]
        doRender()
      }
      const existing = document.querySelector('script[data-cf-turnstile]')
      if (existing) {
        // Script already injected but not yet loaded — poll
        const poll = setInterval(() => {
          if (window.turnstile) { clearInterval(poll); doRender() }
        }, 50)
        return () => { mounted = false; clearInterval(poll) }
      }
      const script = document.createElement('script')
      script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${cbName}&render=explicit`
      script.async = true
      script.dataset.cfTurnstile = '1'
      document.head.appendChild(script)
    }

    return () => {
      mounted = false
      if (currentWidgetId !== undefined && window.turnstile?.remove) {
        try { window.turnstile.remove(currentWidgetId) } catch {}
      }
    }
  }, [step, SITEKEY])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto bg-card dark:bg-black/45 dark:backdrop-blur-2xl border border-border dark:border-white/10 rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait">
        {step === 'age' ? (
          <motion.div
            key="age"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -16 }}
            className="p-5 space-y-4"
          >
            <div className="text-center space-y-1">
              <div className="text-3xl mb-2">🎂</div>
              <h2 className="text-lg font-bold font-display text-foreground">Age Verification</h2>
              <p className="text-xs text-muted-foreground leading-snug">
                CRUSH contains adult content. We need to verify your age.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-center mb-3 text-foreground">When were you born?</p>
              <YearPicker value={selectedYear} onChange={handleYearChange} />
            </div>

            <div className="flex gap-2">
              <select
                value={birthMonth || ''}
                onChange={(e) => { setBirthMonth(Number(e.target.value)); setBirthDay(0) }}
                className="flex-1 h-10 px-3 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-foreground dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-ring dark:focus:ring-primary/60 focus:border-transparent"
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={birthDay || ''}
                onChange={(e) => setBirthDay(Number(e.target.value))}
                disabled={!birthMonth}
                className="w-24 h-10 px-3 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-foreground dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-ring dark:focus:ring-primary/60 focus:border-transparent disabled:opacity-40"
              >
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {showAgeError && (
              <p className="text-center text-sm font-semibold text-destructive">
                You must be 18 or older to enter CRUSH.
              </p>
            )}

            <p className="text-center text-xs font-medium text-amber-500">
              This cannot be changed later.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onGoBack}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Go back
              </button>
              <button
                onClick={() => setStep('captcha')}
                disabled={!isOldEnough}
                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                Continue
                <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            className="p-5 space-y-4"
          >
            <div className="text-center space-y-1">
              <div className="text-3xl mb-2">🤖</div>
              <h2 className="text-lg font-bold font-display text-foreground">One more step</h2>
              <p className="text-sm text-muted-foreground">
                Confirming you&apos;re not a bot before you explore the map.
              </p>
            </div>

            <div className="flex flex-col justify-center min-h-[70px] items-center gap-2">
              {!SITEKEY ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 fill-emerald-500 flex-shrink-0">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  Verification bypassed (dev mode)
                </div>
              ) : (
                <>
                  <div ref={turnstileRef} />
                  {turnstileError && (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-destructive">Verification failed. Please try again.</p>
                      <button
                        onClick={() => {
                          if (window.turnstile && widgetId) window.turnstile.reset(widgetId)
                          setTurnstileError(false)
                          setTurnstileToken(null)
                        }}
                        className="text-sm text-primary underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('age')}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={onVerified}
                disabled={!turnstileToken}
                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Enter CRUSH
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 pb-4 text-center">
        <p className="text-xs text-muted-foreground">
          You must be 18+. By continuing you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">Terms</a>
          {' and '}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>
    </motion.div>
  )
}
