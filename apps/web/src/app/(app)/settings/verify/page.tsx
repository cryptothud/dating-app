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
    api
      .get<MeResponse>('/auth/me')
      .then(setMe)
      .catch(() => {
        /* noop */
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-sm space-y-5 p-5">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 4L6 8l4 4" />
            </svg>
          </Link>
          <h1 className="font-display text-foreground text-xl font-bold">Verification</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Phone verification */}
            <div
              className={`space-y-3 rounded-2xl border p-5 ${me?.verified ? 'border-green-500/20 bg-green-500/5' : 'bg-card border-border'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${me?.verified ? 'bg-green-500/15' : 'bg-muted'}`}
                >
                  {me?.verified ? (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-5 w-5 fill-none stroke-current text-green-500"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8l3.5 3.5L13 4" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="text-muted-foreground h-5 w-5 fill-none stroke-current"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Phone number</p>
                  <p className="text-muted-foreground text-xs">{me?.phone ?? 'Not set'}</p>
                </div>
                {me?.verified && (
                  <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500">
                    Verified
                  </span>
                )}
              </div>

              {!me?.verified && (
                <div className="space-y-2 pt-1">
                  <p className="text-muted-foreground text-xs">
                    Verify your phone to appear on the map, message others, and build trust with
                    your trust score.
                  </p>
                  <Link
                    href="/verify-phone"
                    className="bg-primary block h-10 w-full rounded-xl text-center text-sm font-semibold leading-10 text-white transition-opacity hover:opacity-90"
                  >
                    Verify phone number
                  </Link>
                </div>
              )}
            </div>

            {/* Trust score context */}
            <div className="bg-card border-border space-y-3 rounded-2xl border p-5">
              <p className="text-foreground text-sm font-semibold">Trust score</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Your trust score increases as you verify more about yourself. A higher score makes
                your profile stand out and signals authenticity to other users.
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Phone verified', done: me?.verified ?? false },
                  { label: 'Profile photo added', done: false },
                  { label: 'Email confirmed', done: false },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${done ? 'bg-green-500' : 'bg-muted border-border border'}`}
                    >
                      {done && (
                        <svg
                          viewBox="0 0 10 10"
                          className="h-2.5 w-2.5 fill-none stroke-current text-white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 5l2 2 4-4" />
                        </svg>
                      )}
                    </div>
                    <p
                      className={`text-xs ${done ? 'text-foreground line-through' : 'text-muted-foreground'}`}
                    >
                      {label}
                    </p>
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
