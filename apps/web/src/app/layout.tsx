import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Syne } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ScrollToTop } from '@/components/scroll-to-top'
import { ToastProvider } from '@/components/ui/toast-provider'
import { MaintenanceOverlay } from '@/components/ui/maintenance-overlay'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['700', '800'],
})

// Vercel injects these as bare hostnames: VERCEL_PROJECT_PRODUCTION_URL is the
// project's production domain, VERCEL_URL the individual deployment. Preferring the
// production domain keeps og:image absolute across preview deploys. The previous
// hard-coded crushapp.co fallback pointed og:image at a host that doesn't resolve,
// so every link preview fetched a dead URL. Set NEXT_PUBLIC_WEB_URL to override.
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_WEB_URL) return process.env.NEXT_PUBLIC_WEB_URL
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercelHost) return `https://${vercelHost}`
  return 'http://localhost:3000'
}

const SITE_URL = resolveSiteUrl()
const DESCRIPTION =
  "CRUSH is a map-first dating app that lets you see who's near you right now. Browse in real time, start a conversation, and make a real connection."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'CRUSH — Meet People Near You', template: '%s | CRUSH' },
  description: DESCRIPTION,
  keywords: [
    'dating app',
    'meet people nearby',
    'map dating',
    'real-time dating',
    'local dating',
    'crush app',
  ],
  authors: [{ name: 'CRUSH' }],
  creator: 'CRUSH',
  applicationName: 'CRUSH',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: 'website',
    siteName: 'CRUSH',
    title: 'CRUSH — Meet People Near You',
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'CRUSH — Meet people near you in real time',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CRUSH — Meet People Near You',
    description: DESCRIPTION,
    images: ['/og.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CRUSH' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0d0f14' },
    { media: '(prefers-color-scheme: light)', color: '#f4f5f8' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS PWA: screen.height is the true physical screen height in CSS px — it's
            never affected by the URL-bar viewport bug. With viewportFit=cover the shell
            extends from behind the status bar to the bottom, so screen.height is exactly
            right. visualViewport.height and 100dvh both report the wrong value until first
            user touch; screen.height does not. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(!navigator.standalone)return;document.documentElement.style.setProperty('--pwa-h',window.screen.height+'px')})()`,
          }}
        />
        {/* Preconnect to CARTO tile CDN — eliminates DNS + TLS handshake on first map load */}
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://a.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://b.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://c.basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://d.basemaps.cartocdn.com" crossOrigin="anonymous" />
      </head>
      <body className={`${jakarta.variable} ${syne.variable} font-sans`}>
        <ThemeProvider>
          <ScrollToTop />
          {children}
          <ToastProvider />
          <MaintenanceOverlay />
        </ThemeProvider>
      </body>
    </html>
  )
}
