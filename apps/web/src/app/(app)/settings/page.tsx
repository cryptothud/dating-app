'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LocationRandomizer } from '@/components/map/LocationRandomizer'
import { useSubscription } from '@/hooks/use-subscription'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { profileApi } from '@/lib/profile'
import { authApi } from '@/lib/auth'

type GeoPermission = 'granted' | 'denied' | 'prompt' | 'unavailable'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="text-muted-foreground h-4 w-4 fill-none stroke-current"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={[
        'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
        'focus-visible:ring-primary/50 focus-visible:ring-offset-background appearance-none outline-none focus-visible:ring-1 focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted-foreground/20',
      ].join(' ')}
    >
      <span
        className={[
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth()
  const { isPremium, isPremiumPlus } = useSubscription(isAuthenticated)
  const router = useRouter()

  const [incognito, setIncognito] = useState(false)
  const [travelMode, setTravelMode] = useState(false)
  const [nsfwEnabled, setNsfwEnabled] = useState(false)
  const [nsfwLoaded, setNsfwLoaded] = useState(false)
  const [geoPermission, setGeoPermission] = useState<GeoPermission>('unavailable')

  // Travel mode city search
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<NominatimResult[]>([])
  const [citySearching, setCitySearching] = useState(false)
  const [selectedCity, setSelectedCity] = useState<NominatimResult | null>(null)
  const [travelError, setTravelError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!navigator.permissions) return
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        setGeoPermission(result.state as GeoPermission)
        result.addEventListener('change', () => setGeoPermission(result.state as GeoPermission))
      })
      .catch(() => {})
  }, [])

  // Load NSFW pref from profile
  useEffect(() => {
    if (!isAuthenticated) return
    profileApi
      .getMe()
      .then((p) => {
        setNsfwEnabled(p.nsfwEnabled)
        setNsfwLoaded(true)
      })
      .catch(() => {})
  }, [isAuthenticated])

  const searchCities = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setCityResults([])
      return
    }
    setCitySearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=0`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = (await res.json()) as NominatimResult[]
      setCityResults(data)
    } catch {
      setCityResults([])
    } finally {
      setCitySearching(false)
    }
  }, [])

  const handleCityInput = (q: string) => {
    setCityQuery(q)
    setSelectedCity(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void searchCities(q), 400)
  }

  async function toggleIncognito() {
    const next = !incognito
    try {
      await api.patch('/users/me/incognito', { enabled: next })
      setIncognito(next)
    } catch {
      /* not premium */
    }
  }

  async function saveTravelMode() {
    if (!selectedCity) {
      setTravelError('Search for and select a city first')
      return
    }
    setTravelError('')
    try {
      await api.patch('/location/travel-mode', {
        enabled: true,
        lat: parseFloat(selectedCity.lat),
        lng: parseFloat(selectedCity.lon),
      })
      setTravelMode(true)
      setCityResults([])
    } catch {
      setTravelError('Failed to enable travel mode')
    }
  }

  async function disableTravelMode() {
    try {
      await api.patch('/location/travel-mode', { enabled: false })
      setTravelMode(false)
      setSelectedCity(null)
      setCityQuery('')
    } catch {
      /* ignore */
    }
  }

  async function toggleNsfw() {
    const next = !nsfwEnabled
    setNsfwEnabled(next)
    try {
      await profileApi.update({ nsfwEnabled: next })
    } catch {
      setNsfwEnabled(!next) // revert
    }
  }

  return (
    <div className="h-full space-y-6 overflow-y-auto p-5 pb-8">
      <h1 className="font-display text-foreground text-xl font-bold">Settings</h1>

      {/* Privacy */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
          Privacy
        </h2>
        <LocationRandomizer />

        {/* Location permission */}
        {geoPermission !== 'unavailable' && (
          <div className="bg-card border-border space-y-2 rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm font-semibold">Location Permission</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {geoPermission === 'granted' &&
                    'Location access is enabled — you appear on the map.'}
                  {geoPermission === 'denied' &&
                    "Location access is blocked — you won't appear on the map."}
                  {geoPermission === 'prompt' &&
                    "Location access not yet decided — you'll be asked when you open the map."}
                </p>
              </div>
              <span
                className={[
                  'shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                  geoPermission === 'granted'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : geoPermission === 'denied'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                ].join(' ')}
              >
                {geoPermission}
              </span>
            </div>
            {geoPermission === 'denied' && (
              <p className="text-muted-foreground text-xs">
                To re-enable: click the lock icon in your browser's address bar → Site settings →
                Location → Allow.
              </p>
            )}
          </div>
        )}

        {/* Incognito mode */}
        <div
          className={[
            'bg-card space-y-2 rounded-2xl border p-4',
            isPremium ? 'border-border' : 'border-border opacity-70',
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">Incognito Mode</p>
              <p className="text-muted-foreground mt-0.5 text-xs">Hide yourself from the map</p>
            </div>
            {isPremium ? (
              <Toggle checked={incognito} onChange={() => void toggleIncognito()} />
            ) : (
              <Link href="/upgrade" className="text-xs font-medium text-purple-400 hover:underline">
                Premium
              </Link>
            )}
          </div>
        </div>

        {/* Show adult content */}
        {nsfwLoaded && (
          <div className="bg-card border-border rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm font-medium">Show adult content</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  See explicit profiles and photos from others
                </p>
              </div>
              <Toggle checked={nsfwEnabled} onChange={() => void toggleNsfw()} />
            </div>
          </div>
        )}

        {/* Travel Mode */}
        <div
          className={[
            'bg-card space-y-3 rounded-2xl border p-4',
            isPremiumPlus ? 'border-border' : 'border-border opacity-70',
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">Travel Mode</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Show your dot at a different location
              </p>
            </div>
            {!isPremiumPlus && (
              <Link href="/upgrade" className="text-xs font-medium text-amber-400 hover:underline">
                Premium+
              </Link>
            )}
          </div>
          {isPremiumPlus &&
            (travelMode ? (
              <div className="space-y-2">
                {selectedCity && (
                  <p className="text-muted-foreground text-xs">
                    Currently showing as:{' '}
                    <span className="text-foreground font-medium">
                      {selectedCity.display_name.split(',').slice(0, 2).join(',')}
                    </span>
                  </p>
                )}
                <button
                  onClick={() => void disableTravelMode()}
                  className="border-destructive/50 text-destructive hover:bg-destructive/5 w-full rounded-xl border py-2 text-sm transition-colors"
                >
                  Disable travel mode
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* City search */}
                <div className="relative">
                  <input
                    value={cityQuery}
                    onChange={(e) => handleCityInput(e.target.value)}
                    placeholder="Search for a city…"
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-3 py-2 pr-8 text-sm focus:border-amber-500/50 focus:outline-none"
                  />
                  {citySearching && (
                    <div className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-amber-500/60 border-t-transparent" />
                  )}
                </div>
                {/* Results dropdown */}
                {cityResults.length > 0 && !selectedCity && (
                  <div className="border-border bg-card overflow-hidden rounded-xl border shadow-lg">
                    {cityResults.map((r) => (
                      <button
                        key={r.place_id}
                        onClick={() => {
                          setSelectedCity(r)
                          setCityQuery(r.display_name.split(',').slice(0, 2).join(','))
                          setCityResults([])
                        }}
                        className="text-foreground hover:bg-muted border-border w-full border-b px-3 py-2.5 text-left text-sm transition-colors last:border-0"
                      >
                        <span className="block truncate">{r.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCity && (
                  <p className="text-xs text-emerald-500">
                    ✓ {selectedCity.display_name.split(',').slice(0, 2).join(',')}
                  </p>
                )}
                {travelError && <p className="text-xs text-red-400">{travelError}</p>}
                <button
                  onClick={() => void saveTravelMode()}
                  disabled={!selectedCity}
                  className="w-full rounded-xl bg-amber-500 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40"
                >
                  Enable Travel Mode
                </button>
              </div>
            ))}
        </div>
      </section>

      {/* Account */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
          Account
        </h2>
        <div className="bg-card border-border divide-border divide-y rounded-2xl border">
          {[
            { label: 'Edit Profile', href: '/profile', locked: false },
            {
              label: 'Profile Viewers',
              href: isPremiumPlus ? '/settings/viewers' : '/upgrade',
              badge: 'Premium+',
              locked: !isPremiumPlus,
            },
            { label: 'Change Password', href: '/settings/password', locked: false },
            { label: 'Subscription', href: '/settings/subscription', locked: false },
            { label: 'Blocked Users', href: '/settings/blocked', locked: false },
            { label: 'Notifications', href: '/settings/notifications', locked: false },
            ...(user?.role === 'admin'
              ? [{ label: 'Admin Panel', href: '/control', badge: 'Admin', locked: false }]
              : []),
          ].map(({ label, href, badge, locked }) => (
            <Link
              key={href}
              href={href}
              className={[
                'hover:bg-muted/50 flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors first:rounded-t-2xl last:rounded-b-2xl',
                locked ? 'text-muted-foreground opacity-60' : 'text-foreground',
              ].join(' ')}
            >
              <span>{label}</span>
              <div className="flex items-center gap-2">
                {badge && (
                  <span
                    className={[
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      badge === 'Admin'
                        ? 'text-destructive bg-destructive/10'
                        : 'bg-amber-500/10 text-amber-500',
                    ].join(' ')}
                  >
                    {badge}
                  </span>
                )}
                <ChevronRight />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Legal */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
          Legal
        </h2>
        <div className="bg-card border-border divide-border divide-y rounded-2xl border">
          {[
            { label: 'About CRUSH', href: '/about' },
            { label: 'Terms of Use', href: '/terms' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Safety Policy', href: '/safety' },
            { label: '18 U.S.C. § 2257', href: '/2257' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-between px-5 py-3.5 text-sm transition-colors first:rounded-t-2xl last:rounded-b-2xl"
            >
              {label}
              <ChevronRight />
            </Link>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={async () => {
            await authApi.logout().catch(() => {})
            window.location.href = '/'
          }}
          className="border-destructive/50 text-destructive hover:bg-destructive/5 h-11 w-full rounded-xl border text-sm font-medium transition-colors"
        >
          Sign Out
        </button>
        <Link
          href="/settings/delete"
          className="text-muted-foreground/60 hover:text-destructive/80 flex h-11 w-full items-center justify-center rounded-xl text-sm transition-colors"
        >
          Delete account
        </Link>
      </div>
    </div>
  )
}
