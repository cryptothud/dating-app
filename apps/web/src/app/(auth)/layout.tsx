import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="bg-background relative flex min-h-screen flex-col overflow-hidden dark:bg-[hsl(260_30%_4%)]">
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

      {/* Top bar */}
      <header className="relative flex flex-shrink-0 items-center justify-between px-6 pb-2 pt-5">
        <Link href="/" className="font-display text-primary text-xl font-bold tracking-tight">
          CRUSH
        </Link>
        <ThemeToggle className="dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20 dark:hover:text-white" />
      </header>

      {/* Centered card */}
      <main className="relative flex flex-1 items-center justify-center p-5">
        <div className="bg-card border-border w-full max-w-sm overflow-hidden rounded-3xl border shadow-xl dark:border-white/10 dark:bg-black/45 dark:shadow-2xl dark:backdrop-blur-2xl">
          {children}
        </div>
      </main>

      {/* Bottom legal strip */}
      <footer className="relative flex-shrink-0 px-6 pb-5 text-center">
        <p className="text-muted-foreground text-xs dark:text-white/35">
          <Link
            href="/about"
            className="hover:text-foreground transition-colors dark:hover:text-white/60"
          >
            About
          </Link>
          {' · '}
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors dark:hover:text-white/60"
          >
            Terms
          </Link>
          {' · '}
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors dark:hover:text-white/60"
          >
            Privacy
          </Link>
          {' · '}
          <Link
            href="/safety"
            className="hover:text-foreground transition-colors dark:hover:text-white/60"
          >
            Safety
          </Link>
        </p>
      </footer>
    </div>
  )
}
