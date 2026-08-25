'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { seenInWildApi } from '@/lib/seen-in-wild'
import { useAuth } from '@/hooks/use-auth'
import type { WildSighting } from '@dating-app/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function SightingCard({ sighting }: { sighting: WildSighting }): React.JSX.Element {
  const { otherUser } = sighting
  const blurred = otherUser.blurred

  return (
    <div className="border-border bg-card hover:bg-muted/30 flex items-center gap-4 rounded-2xl border p-4 transition-colors">
      <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
        {otherUser.photoUrl ? (
          <Image
            src={otherUser.photoUrl}
            alt=""
            fill
            className={['object-cover transition-all', blurred ? 'scale-110 blur-xl' : ''].join(
              ' ',
            )}
            sizes="56px"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        {blurred && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-white/80"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {blurred ? (
          <>
            <p className="text-foreground text-sm font-semibold">Someone nearby</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              You crossed paths {timeAgo(sighting.occurredAt)}
            </p>
            <p className="text-primary mt-1 text-xs">Upgrade to reveal</p>
          </>
        ) : (
          <>
            <p className="text-foreground text-sm font-semibold">
              {otherUser.displayName ?? 'Anonymous'}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              You crossed paths {timeAgo(sighting.occurredAt)}
            </p>
          </>
        )}
      </div>

      {!blurred && (
        <Link
          href={`/messages/${otherUser.id}`}
          className="bg-primary flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Message
        </Link>
      )}
    </div>
  )
}

export default function SeenInWildPage(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth()
  const [sightings, setSightings] = useState<WildSighting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    seenInWildApi
      .getSightings()
      .then((data) => {
        setSightings(data)
        const unnotified = data.filter((s) => s.otherUser && !s.otherUser.blurred).map((s) => s.id)
        if (unnotified.length > 0) void seenInWildApi.markNotified(unnotified)
      })
      .catch(() => {
        /* not fatal */
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, isLoading])

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-2xl">
          <svg
            viewBox="0 0 24 24"
            className="stroke-primary h-7 w-7 fill-none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <p className="text-foreground font-semibold">
            Sign in to see who you&apos;ve crossed paths with
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Seen in the Wild shows you people nearby in real life
          </p>
        </div>
        <Link href="/" className="btn-primary">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="border-border bg-background/80 shrink-0 border-b px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-xl">
            <svg
              viewBox="0 0 24 24"
              className="stroke-primary h-4 w-4 fill-none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-foreground text-sm font-bold">Seen in the Wild</h1>
            <p className="text-muted-foreground text-xs">
              People you&apos;ve been near in real life
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : sightings.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
            <svg
              viewBox="0 0 24 24"
              className="stroke-muted-foreground h-10 w-10 fill-none"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-foreground text-sm font-semibold">No sightings yet</p>
            <p className="text-muted-foreground text-xs">
              When you&apos;re near other CRUSH users in real life, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sightings.map((s) => (
              <SightingCard key={s.id} sighting={s} />
            ))}
          </div>
        )}

        {/* Premium upsell if any are blurred */}
        {sightings.some((s) => s.otherUser.blurred) && (
          <div className="bg-primary/[0.08] border-primary/20 mt-4 rounded-2xl border p-4">
            <p className="text-foreground mb-1 text-sm font-semibold">
              Unlock full reveals with Premium
            </p>
            <p className="text-muted-foreground mb-3 text-xs">
              See the name and photo of everyone you&apos;ve crossed paths with.
            </p>
            <Link
              href="/upgrade"
              className="bg-primary inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
