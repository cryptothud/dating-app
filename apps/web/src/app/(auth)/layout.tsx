import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-background dark:bg-[hsl(260_30%_4%)]">
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
      <header className="relative flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-2">
        <Link href="/" className="font-display font-bold text-xl text-primary tracking-tight">
          CRUSH
        </Link>
        <ThemeToggle className="dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/60 dark:hover:text-white" />
      </header>

      {/* Centered card */}
      <main className="relative flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-card dark:bg-black/45 dark:backdrop-blur-2xl rounded-3xl border border-border dark:border-white/10 shadow-xl dark:shadow-2xl overflow-hidden">
          {children}
        </div>
      </main>

      {/* Bottom legal strip */}
      <footer className="relative flex-shrink-0 pb-5 px-6 text-center">
        <p className="text-xs text-muted-foreground dark:text-white/35">
          <Link href="/about" className="hover:text-foreground dark:hover:text-white/60 transition-colors">About</Link>
          {' · '}
          <Link href="/terms" className="hover:text-foreground dark:hover:text-white/60 transition-colors">Terms</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-foreground dark:hover:text-white/60 transition-colors">Privacy</Link>
          {' · '}
          <Link href="/safety" className="hover:text-foreground dark:hover:text-white/60 transition-colors">Safety</Link>
        </p>
      </footer>
    </div>
  )
}
