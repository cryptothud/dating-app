import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'About CRUSH' }

const FEATURES = [
  {
    title: 'Live map',
    description:
      'See who has been nearby recently — every dot on the map is a real person with a real last-seen location.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 16l4.553-2.276A1 1 0 0021 19.382V8.618a1 1 0 00-.553-.894L15 5m0 15V5m0 0L9 7" />
      </svg>
    ),
  },
  {
    title: 'Actively Looking',
    description:
      'Toggle a 2-hour signal that you\'re open to meeting. A pulsing ring appears on your dot so others know you\'re available right now.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M6.3 6.3a8 8 0 000 11.4M17.7 6.3a8 8 0 010 11.4M3.5 3.5a12 12 0 000 17M20.5 3.5a12 12 0 010 17" />
      </svg>
    ),
  },
  {
    title: 'Free 1:1 DMs',
    description:
      'Break the ice with anyone on the map. Text, photos, and voice notes — no match required, no paywall. Direct messages are free forever.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: 'Safety Date Mode',
    description:
      'Share your date details — who, when, where — with a trusted contact who gets live updates and an SOS alert if you don\'t check in. Always free.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
]

const STEPS = [
  {
    title: 'Create a free account',
    description: 'Sign up with email, verify your phone number, and build a profile in under 2 minutes. No credit card required.',
  },
  {
    title: 'Appear on the map',
    description: 'Share your location and your dot appears on the live map for nearby users. Your exact coordinates are always fuzzed — no one can pinpoint you.',
  },
  {
    title: 'Connect and meet',
    description: 'Browse nearby profiles, send a DM or voice note, enable Actively Looking to signal you\'re available. Real connections, in real life.',
  },
]

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['Browse the live map', 'View profiles', '1:1 DMs (unlimited)', 'Safety Date Mode', 'Basic filters'],
    cta: 'Get started',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: 'per month',
    features: ['Everything in Free', 'Group & event chats', 'Voice notes', 'Read receipts', 'Incognito mode', '1 boost/week'],
    cta: 'Go Premium',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Premium+',
    price: '$19.99',
    period: 'per month',
    features: ['Everything in Premium', 'Profile viewers', '3 boosts/week', 'Travel mode', 'Seen in the Wild reveals'],
    cta: 'Go Premium+',
    href: '/signup',
    highlight: false,
  },
]

export default function AboutPage(): React.JSX.Element {
  return (
    <div className="space-y-14 sm:space-y-20">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative -mx-5 -mt-8 sm:-mt-12 px-5 pt-10 pb-12 sm:pt-14 sm:pb-16 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% -10%, hsl(270 70% 60% / 0.15) 0%, transparent 65%)' }}
        />
        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Real-time · US launch
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-foreground">
            Meet people<br />
            <span className="text-primary">nearby, right now.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            CRUSH puts you on a live map with people around you who are open to connecting — not
            profiles from six months ago, not people 50 miles away. Real people, real time.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Browse the Map
              <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
            >
              Create Account — Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground tracking-tight">Built different</h2>
          <p className="text-muted-foreground mt-1">No swipe queues, no algorithmic gatekeeping. Just people near you, right now.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {f.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground tracking-tight">How it works</h2>
          <p className="text-muted-foreground mt-1">Go from zero to connected in minutes.</p>
        </div>
        <div className="space-y-0">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-5 pb-8 relative">
              {i < STEPS.length - 1 && (
                <div className="absolute left-[15px] top-10 bottom-0 w-px bg-border" />
              )}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Privacy callout ──────────────────────────────── */}
      <section className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-lg text-foreground">Privacy by design</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your exact GPS coordinates never leave our servers. Every location is randomized within
          your chosen fuzz radius (minimum 200 m) before being sent to any client. Raw coordinates
          are never stored in plaintext. You control how precise or approximate your position appears.
        </p>
        <Link href="/privacy" className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline">
          Read our Privacy Policy →
        </Link>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground tracking-tight">Simple, honest pricing</h2>
          <p className="text-muted-foreground mt-1">Start free. Upgrade when you want more. Cancel anytime in 2 taps.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={[
                'relative rounded-2xl border pt-9 px-5 pb-5 flex flex-col gap-4',
                t.highlight
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card',
              ].join(' ')}
            >
              {t.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white whitespace-nowrap">
                  Popular
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{t.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-display font-bold text-2xl text-foreground">{t.price}</span>
                  <span className="text-xs text-muted-foreground">{t.period}</span>
                </div>
              </div>
              <ul className="space-y-1.5 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 fill-none stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8l3 3 7-6" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={t.href}
                className={[
                  'mt-auto h-9 rounded-xl text-sm font-semibold flex items-center justify-center transition-opacity hover:opacity-90',
                  t.highlight ? 'bg-primary text-white' : 'border border-border text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Safety ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-lg text-foreground">Zero tolerance for CSAM</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every uploaded photo is automatically scanned by Azure Content Safety, Google Vision
          SafeSearch, and Cloudinary AI before it reaches any storage. Any content that depicts
          minors in a sexual context results in: immediate upload block, instant account suspension,
          and a mandatory report to the NCMEC CyberTipline under 18 U.S.C. § 2258A. No exceptions.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/safety" className="text-primary hover:underline font-medium">Safety Policy →</Link>
          <Link href="/takedown" className="text-primary hover:underline font-medium">TAKE IT DOWN Act →</Link>
          <Link href="/content-removal" className="text-primary hover:underline font-medium">Report Content →</Link>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────── */}
      <section className="border-t border-border pt-10 space-y-4">
        <h2 className="font-display font-bold text-xl text-foreground tracking-tight">Get in touch</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'General', email: 'hello@crush.app' },
            { label: 'Press', email: 'press@crush.app' },
            { label: 'Safety & abuse', email: 'safety@crush.app' },
            { label: 'Legal', email: 'legal@crush.app' },
          ].map((c) => (
            <a
              key={c.email}
              href={`mailto:${c.email}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-0 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 hover:bg-primary/3 transition-colors group"
            >
              <span className="text-sm font-medium text-foreground">{c.label}</span>
              <span className="text-xs sm:text-sm text-muted-foreground group-hover:text-primary transition-colors">{c.email}</span>
            </a>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          CRUSH is operated by Crush Inc., a Delaware corporation. US-only service.{' '}
          Map data ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            OpenStreetMap
          </a>{' '}
          contributors.
        </p>
      </section>

    </div>
  )
}
