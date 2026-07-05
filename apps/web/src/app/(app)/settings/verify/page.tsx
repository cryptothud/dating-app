'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface MeResponse {
  verified: boolean
  email: string
  phone: string | null
}

export default function VerifyPage(): React.JSX.Element {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<MeResponse>('/auth/me')
      .then(setMe)
      .catch(() => { /* noop */ })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-5 max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4L6 8l4 4" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold font-display text-foreground">Verification</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Phone verification */}
            <div className={`rounded-2xl border p-5 space-y-3 ${me?.verified ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${me?.verified ? 'bg-green-500/15' : 'bg-muted'}`}>
                  {me?.verified ? (
                    <svg viewBox="0 0 16 16" className="w-5 h-5 text-green-500 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8l3.5 3.5L13 4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted-foreground fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Phone number</p>
                  <p className="text-xs text-muted-foreground">{me?.phone ?? 'Not set'}</p>
                </div>
                {me?.verified && (
                  <span className="ml-auto text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                )}
              </div>

              {!me?.verified && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Verify your phone to appear on the map, message others, and build trust with your trust score.
                  </p>
                  <Link
                    href="/verify-phone"
                    className="block w-full text-center h-10 rounded-xl bg-primary text-white text-sm font-semibold leading-10 hover:opacity-90 transition-opacity"
                  >
                    Verify phone number
                  </Link>
                </div>
              )}
            </div>

            {/* Trust score context */}
            <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Trust score</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your trust score increases as you verify more about yourself. A higher score makes your profile stand out and signals authenticity to other users.
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Phone verified', done: me?.verified ?? false },
                  { label: 'Profile photo added', done: false },
                  { label: 'Email confirmed', done: false },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : 'bg-muted border border-border'}`}>
                      {done && (
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 5l2 2 4-4" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-xs ${done ? 'text-foreground line-through' : 'text-muted-foreground'}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
