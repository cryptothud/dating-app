'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { authApi } from '@/lib/auth'
import { ApiRequestError } from '@/lib/api'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { PasswordInput } from '@/components/ui/password-input'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Required'),
})
type FormValues = z.infer<typeof schema>

export default function HomePage(): React.JSX.Element {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues): Promise<void> {
    setServerError(null)
    try {
      await authApi.login(values)
      sessionStorage.setItem('crush_age_verified', '1')
      router.push('/map')
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      {/* Base background */}
      <div className="absolute inset-0 bg-background dark:bg-[hsl(260_30%_4%)]" />

      {/* Light-mode gradient */}
      <div
        className="pointer-events-none absolute inset-0 block dark:hidden"
        style={{
          background:
            'radial-gradient(ellipse at 15% 15%, hsl(270 80% 93%) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, hsl(330 80% 93%) 0%, transparent 50%)',
        }}
      />

      {/* Dark-mode gradient */}
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse at 25% 15%, hsl(270 70% 25%) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, hsl(330 65% 20%) 0%, transparent 55%)',
        }}
      />

      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle className="dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/60 dark:hover:text-white" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-sm mx-5 bg-card dark:bg-black/45 dark:backdrop-blur-2xl rounded-3xl border border-border dark:border-white/10 shadow-xl dark:shadow-2xl overflow-hidden"
      >
        <div className="p-7 space-y-5">
          {/* Logo + tagline */}
          <div className="text-center space-y-1 pb-1">
            <h1 className="font-display font-bold text-3xl text-primary tracking-tight">CRUSH</h1>
            <p className="text-sm text-muted-foreground dark:text-white/45">Meet people near you, right now.</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
            <div>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="Email"
                className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/35 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent transition-all"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <PasswordInput
                {...register('password')}
                autoComplete="current-password"
                placeholder="Password"
                className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/12 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/35 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent transition-all"
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div className="text-right -mt-1">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/65 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-primary rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground dark:text-white/45">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-foreground dark:text-white font-semibold hover:text-primary transition-colors">
              Sign up
            </Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border dark:bg-white/10" />
            <span className="text-xs text-muted-foreground dark:text-white/35 font-medium">or</span>
            <div className="flex-1 h-px bg-border dark:bg-white/10" />
          </div>

          {/* Anonymous */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('crush_anon_intent', '1')
              router.push('/map')
            }}
            className="flex items-center justify-center gap-2.5 w-full h-11 rounded-xl border border-border dark:border-white/15 text-muted-foreground dark:text-white/70 text-sm font-medium hover:bg-muted dark:hover:bg-white/5 hover:text-foreground dark:hover:text-white transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Use Anonymously
          </button>

          {/* About */}
          <p className="text-center">
            <Link
              href="/about"
              className="text-sm text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/75 transition-colors font-medium underline underline-offset-2"
            >
              About CRUSH
            </Link>
          </p>

          {/* Legal */}
          <div className="space-y-2 pt-1">
            <p className="text-center text-[11px] text-muted-foreground/70 dark:text-white/30 leading-relaxed">
              By entering, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-foreground dark:hover:text-white/50">Terms of Use</Link>
              {', '}
              <Link href="/takedown" className="underline hover:text-foreground dark:hover:text-white/50">TAKE IT DOWN Act Policy</Link>
              {' and '}
              <Link href="/safety" className="underline hover:text-foreground dark:hover:text-white/50">Safety Policy</Link>.
              You must be 18 or older to enter.
            </p>
            <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground/50 dark:text-white/25">
              <Link href="/content-removal" className="underline hover:text-foreground dark:hover:text-white/45">
                Report or Request Removal of Content
              </Link>
            </div>
            <div className="text-center">
              <Link href="/2257" className="text-[11px] text-muted-foreground/50 dark:text-white/25 underline hover:text-foreground dark:hover:text-white/45">
                18 U.S.C. § 2257 Statement
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
