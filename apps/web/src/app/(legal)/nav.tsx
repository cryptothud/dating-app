'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/safety', label: 'Safety' },
]

export function LegalNav(): React.JSX.Element {
  const pathname = usePathname()

  return (
    <nav className="hidden sm:flex items-center gap-5 sm:mr-2">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={[
              'relative pb-0.5 text-sm transition-colors',
              active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {label}
            {active && (
              <motion.span
                className="absolute bottom-0 -left-[5%] right-0 h-px bg-foreground rounded-full block w-[110%]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                style={{ originX: '50%' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
