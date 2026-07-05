import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { HamburgerMenu } from '@/components/ui/hamburger-menu'
import { LegalNav } from './nav'

export default function LegalLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-xl text-primary tracking-tight">CRUSH</Link>
          <div className="flex items-center gap-2">
            <LegalNav />
            <ThemeToggle />
            <HamburgerMenu className="sm:hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-5 py-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/safety" className="hover:text-foreground transition-colors">Safety Policy</Link>
            <Link href="/takedown" className="hover:text-foreground transition-colors">TAKE IT DOWN Act</Link>
            <Link href="/2257" className="hover:text-foreground transition-colors">18 U.S.C. § 2257</Link>
            <Link href="/content-removal" className="hover:text-foreground transition-colors">Content Removal</Link>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4">
            © {new Date().getFullYear()} Crush Inc. All rights reserved. Delaware, USA.
          </p>
        </div>
      </footer>
    </div>
  )
}
