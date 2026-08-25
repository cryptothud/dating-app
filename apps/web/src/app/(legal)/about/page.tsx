import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'About CRUSH' }

const FEATURES = [
  {
    title: 'Live map',
    description:
      'See who has been nearby recently — every dot on the map is a real person with a real last-seen location.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-none stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 16l4.553-2.276A1 1 0 0021 19.382V8.618a1 1 0 00-.553-.894L15 5m0 15V5m0 0L9 7" />
      </svg>
    ),
  },
  {
    title: 'Actively Looking',
    description:
      "Toggle a 2-hour signal that you're open to meeting. A pulsing ring appears on your dot so others know you're available right now.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-none stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-none stroke-current"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: 'Safety Date Mode',
    description:
      "Share your date details — who, when, where — with a trusted contact who gets live updates and an SOS alert if you don't check in. Always free.",
    icon: (
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
    ),
  },
]

const STEPS = [
  {
    title: 'Create a free account',
    description:
      'Sign up with email, verify your phone number, and build a profile in under 2 minutes. No credit card required.',
  },
  {
    title: 'Appear on the map',
    description:
      'Share your location and your dot appears on the live map for nearby users. Your exact coordinates are always fuzzed — no one can pinpoint you.',
  },
  {
    title: 'Connect and meet',
    description:
      "Browse nearby profiles, send a DM or voice note, enable Actively Looking to signal you're available. Real connections, in real life.",
  },
]

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Browse the live map',
      'View profiles',
      '1:1 DMs (unlimited)',
      'Safety Date Mode',
      'Basic filters',
    ],
    cta: 'Get started',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: 'per month',
    features: [
      'Everything in Free',
      'Group & event chats',
      'Voice notes',
      'Read receipts',
      'Incognito mode',
      '1 boost/week',
    ],
    cta: 'Go Premium',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Premium+',
    price: '$19.99',
    period: 'per month',
    features: [
      'Everything in Premium',
      'Profile viewers',
      '3 boosts/week',
      'Travel mode',
      'Seen in the Wild reveals',
    ],
    cta: 'Go Premium+',
    href: '/signup',
    highlight: false,
  },
]

export default function AboutPage(): React.JSX.Element {
  return (
    <div className="space-y-14 sm:space-y-20">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative -mx-5 -mt-8 overflow-hidden px-5 pb-12 pt-10 text-center sm:-mt-12 sm:pb-16 sm:pt-14">
        <div className="from-primary/[0.08] via-primary/[0.04] pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% -10%, hsl(270 70% 60% / 0.15) 0%, transparent 65%)',
          }}
        />
        <div className="relative z-10 mx-auto max-w-xl space-y-6">
          <div className="border-primary/20 bg-primary/[0.08] text-primary inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
            <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
            Real-time · US launch
          </div>
          <h1 className="font-display text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Meet people
            <br />
            <span className="text-primary">nearby, right now.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
            CRUSH puts you on a live map with people around you who are open to connecting — not
            profiles from six months ago, not people 50 miles away. Real people, real time.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/map"
              className="bg-primary inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Browse the Map
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
            <Link
              href="/signup"
              className="border-border text-foreground hover:bg-muted inline-flex h-11 items-center gap-2 rounded-xl border px-6 text-sm font-semibold transition-colors"
            >
              Create Account — Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-foreground text-2xl font-bold tracking-tight">
            Built different
          </h2>
          <p className="text-muted-foreground mt-1">
            No swipe queues, no algorithmic gatekeeping. Just people near you, right now.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="border-border bg-card hover:border-primary/30 space-y-3 rounded-2xl border p-5 transition-colors"
            >
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
                {f.icon}
              </div>
              <div>
                <h3 className="text-foreground font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="font-display text-foreground text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground mt-1">Go from zero to connected in minutes.</p>
        </div>
        <div className="space-y-0">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative flex gap-5 pb-8">
              {i < STEPS.length - 1 && (
                <div className="bg-border absolute bottom-0 left-[15px] top-10 w-px" />
              )}
              <div className="bg-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="text-foreground font-semibold">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Privacy callout ──────────────────────────────── */}
      <section className="space-y-3 rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-green-600 dark:text-green-400">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="font-display text-foreground text-lg font-bold">Privacy by design</h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your exact GPS coordinates never leave our servers. Every location is randomized within
          your chosen fuzz radius (minimum 200 m) before being sent to any client. Raw coordinates
          are never stored in plaintext. You control how precise or approximate your position
          appears.
        </p>
        <Link
          href="/privacy"
          className="text-sm font-medium text-green-600 hover:underline dark:text-green-400"
        >
          Read our Privacy Policy →
        </Link>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-foreground text-2xl font-bold tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="text-muted-foreground mt-1">
            Start free. Upgrade when you want more. Cancel anytime in 2 taps.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={[
                'relative flex flex-col gap-4 rounded-2xl border px-5 pb-5 pt-9',
                t.highlight
                  ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                  : 'border-border bg-card',
              ].join(' ')}
            >
              {t.highlight && (
                <div className="bg-primary absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold text-white">
                  Popular
                </div>
              )}
              <div>
                <p className="text-foreground font-semibold">{t.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-foreground text-2xl font-bold">{t.price}</span>
                  <span className="text-muted-foreground text-xs">{t.period}</span>
                </div>
              </div>
              <ul className="flex-1 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="text-muted-foreground flex items-start gap-2 text-sm">
                    <svg
                      viewBox="0 0 16 16"
                      className="stroke-primary mt-0.5 h-3.5 w-3.5 flex-shrink-0 fill-none"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8l3 3 7-6" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={t.href}
                className={[
                  'mt-auto flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition-opacity hover:opacity-90',
                  t.highlight
                    ? 'bg-primary text-white'
                    : 'border-border text-foreground hover:bg-muted border',
                ].join(' ')}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Safety ───────────────────────────────────────── */}
      <section className="border-border bg-card space-y-4 rounded-2xl border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="font-display text-foreground text-lg font-bold">
            Zero tolerance for CSAM
          </h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Every uploaded photo is automatically scanned by Azure Content Safety, Google Vision
          SafeSearch, and Cloudinary AI before it reaches any storage. Any content that depicts
          minors in a sexual context results in: immediate upload block, instant account suspension,
          and a mandatory report to the NCMEC CyberTipline under 18 U.S.C. § 2258A. No exceptions.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/safety" className="text-primary font-medium hover:underline">
            Safety Policy →
          </Link>
          <Link href="/takedown" className="text-primary font-medium hover:underline">
            TAKE IT DOWN Act →
          </Link>
          <Link href="/content-removal" className="text-primary font-medium hover:underline">
            Report Content →
          </Link>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────── */}
      <section className="border-border space-y-4 border-t pt-10">
        <h2 className="font-display text-foreground text-xl font-bold tracking-tight">
          Get in touch
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'General', email: 'hello@crush.app' },
            { label: 'Press', email: 'press@crush.app' },
            { label: 'Safety & abuse', email: 'safety@crush.app' },
            { label: 'Legal', email: 'legal@crush.app' },
          ].map((c) => (
            <a
              key={c.email}
              href={`mailto:${c.email}`}
              className="border-border bg-card hover:border-primary/30 hover:bg-primary/[0.03] group flex flex-col gap-0.5 rounded-xl border px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-0"
            >
              <span className="text-foreground text-sm font-medium">{c.label}</span>
              <span className="text-muted-foreground group-hover:text-primary text-xs transition-colors sm:text-sm">
                {c.email}
              </span>
            </a>
          ))}
        </div>
        <p className="text-muted-foreground pt-2 text-xs">
          CRUSH is operated by Crush Inc., a Delaware corporation. US-only service. Map data ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline"
          >
            OpenStreetMap
          </a>{' '}
          contributors.
        </p>
      </section>
    </div>
  )
}
