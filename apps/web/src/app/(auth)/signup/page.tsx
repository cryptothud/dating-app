'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { authApi } from '@/lib/auth'
import { ApiRequestError } from '@/lib/api'
import { YearPicker, CURRENT_YEAR, DEFAULT_YEAR } from '@/components/ui/year-picker'
import { PasswordInput } from '@/components/ui/password-input'

const MIN_AGE = 18
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type StrengthLevel = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string }

function getStrength(pw: string): StrengthLevel {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  const map: Record<number, Omit<StrengthLevel, 'score'>> = {
    0: { label: 'Too short', color: 'bg-destructive' },
    1: { label: 'Weak', color: 'bg-destructive' },
    2: { label: 'Fair', color: 'bg-amber-500' },
    3: { label: 'Good', color: 'bg-blue-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
  }
  return { score: clamped, ...map[clamped] } as StrengthLevel
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (raw.startsWith('+')) return raw
  if (digits.length <= 10) return `+1${digits}`
  return `+${digits}`
}

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Use E.164 format, e.g. +12125551234'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, and number'),
})
type FormValues = z.infer<typeof schema>

export default function SignupPage(): React.JSX.Element {
  const router = useRouter()
  const [step, setStep] = useState<'age' | 'details'>('age')
  const [birthYear, setBirthYear] = useState(DEFAULT_YEAR)
  const [birthMonth, setBirthMonth] = useState(0)
  const [birthDay, setBirthDay] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)

  const isOldEnough = (() => {
    if (!birthMonth || !birthDay) return false
    if (birthYear > CURRENT_YEAR - MIN_AGE) return false
    const eighteenthBday = new Date(birthYear + MIN_AGE, birthMonth - 1, birthDay)
    return new Date() >= eighteenthBday
  })()

  const showAgeError = (() => {
    if (birthYear === DEFAULT_YEAR) return false
    if (birthYear > CURRENT_YEAR - MIN_AGE) return true
    if (birthMonth > 0 && birthDay > 0 && !isOldEnough) return true
    return false
  })()

  const maxDay = birthMonth ? new Date(birthYear, birthMonth, 0).getDate() : 31
  const handleYearChange = (year: number): void => {
    setBirthYear(year)
    if (birthMonth) {
      const newMax = new Date(year, birthMonth, 0).getDate()
      if (birthDay > newMax) setBirthDay(0)
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' })
  const strength = getStrength(passwordValue)

  async function onSubmit(values: FormValues): Promise<void> {
    setServerError(null)
    try {
      const dateOfBirth = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
      await authApi.signup({ ...values, dateOfBirth })
      sessionStorage.setItem('crush_age_verified', '1')
      router.push('/verify-phone')
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : 'Something went wrong')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {step === 'age' ? (
          <motion.div
            key="age"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="p-7 space-y-5"
          >
            <div className="text-center space-y-1">
              <div className="text-3xl mb-2">🎂</div>
              <h1 className="text-2xl font-bold font-display text-foreground dark:text-white tracking-tight">
                How old are you?
              </h1>
              <p className="text-sm text-muted-foreground dark:text-white/50">
                CRUSH is for adults only. This cannot be changed later.
              </p>
            </div>

            <YearPicker value={birthYear} onChange={handleYearChange} />

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
                You must be 18 or older to join CRUSH.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/map')}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground dark:text-white/50 hover:bg-muted dark:hover:bg-white/8 transition-colors"
              >
                Go back
              </button>
              <button
                onClick={() => setStep('details')}
                disabled={!isOldEnough}
                className="flex-1 h-11 bg-primary rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-1.5"
              >
                Continue
                <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground dark:text-white/45">
              Already have an account?{' '}
              <Link href="/" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="p-7 space-y-5"
          >
            <div className="text-center space-y-0.5">
              <h1 className="text-2xl font-bold font-display text-foreground dark:text-white tracking-tight">
                Create account
              </h1>
              <p className="text-sm text-muted-foreground dark:text-white/50">
                Almost there — just a few more details.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
              <div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/35 text-sm focus:outline-none focus:ring-1 focus:ring-ring dark:focus:ring-primary/60 focus:border-transparent transition-all"
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <input
                  {...register('phone')}
                  type="tel"
                  autoComplete="tel"
                  placeholder="Phone number"
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value)
                    setValue('phone', formatted, { shouldValidate: true })
                  }}
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/35 text-sm focus:outline-none focus:ring-1 focus:ring-ring dark:focus:ring-primary/60 focus:border-transparent transition-all"
                />
                {errors.phone
                  ? <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                  : <p className="text-xs text-muted-foreground/60 dark:text-white/25 mt-1">US number auto-formats — or enter any country code manually (+44…)</p>
                }
              </div>

              <div>
                <PasswordInput
                  {...register('password')}
                  autoComplete="new-password"
                  placeholder="Password"
                  className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/35 text-sm focus:outline-none focus:ring-1 focus:ring-ring dark:focus:ring-primary/60 focus:border-transparent transition-all"
                />
                {passwordValue.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={[
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            strength.score >= n ? strength.color : 'bg-black/10 dark:bg-white/10',
                          ].join(' ')}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strength.score <= 1 ? 'text-destructive' : strength.score === 2 ? 'text-amber-500' : strength.score === 3 ? 'text-blue-500' : 'text-green-500'}`}>
                      {strength.label}
                      {strength.score < 3 && ' — add symbols or length to strengthen'}
                    </p>
                  </div>
                )}
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
              </div>

              {serverError && <p className="text-sm text-destructive">{serverError}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-primary rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <button
              onClick={() => setStep('age')}
              className="w-full text-center text-sm text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/65 transition-colors"
            >
              ← Back
            </button>

            <p className="text-center text-[11px] text-muted-foreground/70 dark:text-white/25 leading-relaxed">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="underline hover:text-foreground dark:hover:text-white/45">Terms of Use</Link>
              {' and '}
              <Link href="/privacy" className="underline hover:text-foreground dark:hover:text-white/45">Privacy Policy</Link>.
              You must be 18+.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
