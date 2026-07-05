import Link from 'next/link'

export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      {/* Gradient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 block dark:hidden"
          style={{ background: 'radial-gradient(ellipse at 20% 20%, hsl(270 80% 93%) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(330 80% 93%) 0%, transparent 50%)' }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{ background: 'radial-gradient(ellipse at 25% 15%, hsl(270 70% 25%) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, hsl(330 65% 20%) 0%, transparent 55%)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm">
        <Link href="/" className="font-display font-bold text-2xl text-primary tracking-tight">
          CRUSH
        </Link>

        <div className="flex flex-col items-center gap-2">
          <span className="font-display font-bold text-[96px] leading-none text-primary/20 select-none">
            404
          </span>
          <h1 className="font-display font-bold text-2xl text-foreground">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This page doesn&apos;t exist or was moved. Head back to find people near you.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/map"
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 16l4.553-2.276A1 1 0 0021 19.382V8.618a1 1 0 00-.553-.894L15 5m0 15V5m0 0L9 7" />
            </svg>
            Open map
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center px-5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
