import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { HamburgerMenu } from '@/components/ui/hamburger-menu'
import { LegalNav } from './nav'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-border sticky top-0 z-50 border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="font-display text-primary text-xl font-bold tracking-tight">
            CRUSH
          </Link>
          <div className="flex items-center gap-2">
            <LegalNav />
            <ThemeToggle />
            <HamburgerMenu className="sm:hidden" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">{children}</main>

      <footer className="border-border mt-16 border-t">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Use
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/safety" className="hover:text-foreground transition-colors">
              Safety Policy
            </Link>
            <Link href="/takedown" className="hover:text-foreground transition-colors">
              TAKE IT DOWN Act
            </Link>
            <Link href="/2257" className="hover:text-foreground transition-colors">
              18 U.S.C. § 2257
            </Link>
            <Link href="/content-removal" className="hover:text-foreground transition-colors">
              Content Removal
            </Link>
          </div>
          <p className="text-muted-foreground/60 mt-4 text-xs">
            © {new Date().getFullYear()} Crush Inc. All rights reserved. Delaware, USA.
          </p>
        </div>
      </footer>
    </div>
  )
}
