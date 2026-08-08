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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Base background */}
      <div className="bg-background absolute inset-0 dark:bg-[hsl(260_30%_4%)]" />

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
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle className="dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20 dark:hover:text-white" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-card border-border relative z-10 mx-5 w-full max-w-sm overflow-hidden rounded-3xl border shadow-xl dark:border-white/10 dark:bg-black/45 dark:shadow-2xl dark:backdrop-blur-2xl"
      >
        <div className="space-y-5 p-7">
          {/* Logo + tagline */}
          <div className="space-y-1 pb-1 text-center">
            <h1 className="font-display text-primary text-3xl font-bold tracking-tight">CRUSH</h1>
            <p className="text-muted-foreground text-sm dark:text-white/45">
              Meet people near you, right now.
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
            <div>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="Email"
                className="dark:bg-white/8 border-black/8 dark:border-white/12 text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border bg-black/5 px-4 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-1 dark:text-white dark:placeholder:text-white/35"
              />
              {errors.email && (
                <p className="text-destructive mt-1 text-xs">{errors.email.message}</p>
              )}
            </div>

            <div>
              <PasswordInput
                {...register('password')}
                autoComplete="current-password"
                placeholder="Password"
                className="dark:bg-white/8 border-black/8 dark:border-white/12 text-foreground placeholder:text-muted-foreground focus:ring-ring h-11 w-full rounded-xl border bg-black/5 px-4 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-1 dark:text-white dark:placeholder:text-white/35"
              />
              {errors.password && (
                <p className="text-destructive mt-1 text-xs">{errors.password.message}</p>
              )}
            </div>

            <div className="-mt-1 text-right">
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors dark:text-white/40 dark:hover:text-white/65"
              >
                Forgot password?
              </Link>
            </div>

            {serverError && <p className="text-destructive text-sm">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary h-11 w-full rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="text-muted-foreground text-center text-sm dark:text-white/45">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-foreground hover:text-primary font-semibold transition-colors dark:text-white"
            >
              Sign up
            </Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="bg-border h-px flex-1 dark:bg-white/10" />
            <span className="text-muted-foreground text-xs font-medium dark:text-white/35">or</span>
            <div className="bg-border h-px flex-1 dark:bg-white/10" />
          </div>

          {/* Anonymous */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('crush_anon_intent', '1')
              router.push('/map')
            }}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border text-sm font-medium transition-all dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Use Anonymously
          </button>

          {/* About */}
          <p className="text-center">
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline underline-offset-2 transition-colors dark:text-white/50 dark:hover:text-white/75"
            >
              About CRUSH
            </Link>
          </p>

          {/* Legal */}
          <div className="space-y-2 pt-1">
            <p className="text-muted-foreground/70 text-center text-[11px] leading-relaxed dark:text-white/30">
              By entering, you agree to our{' '}
              <Link
                href="/terms"
                className="hover:text-foreground underline dark:hover:text-white/50"
              >
                Terms of Use
              </Link>
              {', '}
              <Link
                href="/takedown"
                className="hover:text-foreground underline dark:hover:text-white/50"
              >
                TAKE IT DOWN Act Policy
              </Link>
              {' and '}
              <Link
                href="/safety"
                className="hover:text-foreground underline dark:hover:text-white/50"
              >
                Safety Policy
              </Link>
              . You must be 18 or older to enter.
            </p>
            <div className="text-muted-foreground/50 flex items-center justify-center gap-3 text-[11px] dark:text-white/25">
              <Link
                href="/content-removal"
                className="hover:text-foreground underline dark:hover:text-white/45"
              >
                Report or Request Removal of Content
              </Link>
            </div>
            <div className="text-center">
              <Link
                href="/2257"
                className="text-muted-foreground/50 hover:text-foreground text-[11px] underline dark:text-white/25 dark:hover:text-white/45"
              >
                18 U.S.C. § 2257 Statement
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
