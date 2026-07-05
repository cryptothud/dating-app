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
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0">
        {otherUser.photoUrl ? (
          <Image
            src={otherUser.photoUrl}
            alt=""
            fill
            className={['object-cover transition-all', blurred ? 'blur-xl scale-110' : ''].join(' ')}
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        {blurred && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white/80" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {blurred ? (
          <>
            <p className="text-sm font-semibold text-foreground">Someone nearby</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You crossed paths {timeAgo(sighting.occurredAt)}
            </p>
            <p className="text-xs text-primary mt-1">Upgrade to reveal</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">
              {otherUser.displayName ?? 'Anonymous'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You crossed paths {timeAgo(sighting.occurredAt)}
            </p>
          </>
        )}
      </div>

      {!blurred && (
        <Link
          href={`/messages/${otherUser.id}`}
          className="shrink-0 h-8 px-3 rounded-full bg-primary text-white text-xs font-semibold flex items-center hover:opacity-90 transition-opacity"
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
    seenInWildApi.getSightings().then((data) => {
      setSightings(data)
      const unnotified = data.filter((s) => s.otherUser && !s.otherUser.blurred).map((s) => s.id)
      if (unnotified.length > 0) void seenInWildApi.markNotified(unnotified)
    }).catch(() => { /* not fatal */ }).finally(() => setLoading(false))
  }, [isAuthenticated, isLoading])

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-primary" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-foreground">Sign in to see who you&apos;ve crossed paths with</p>
          <p className="text-sm text-muted-foreground mt-1">Seen in the Wild shows you people nearby in real life</p>
        </div>
        <Link href="/" className="btn-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="shrink-0 px-5 pt-4 pb-3 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold font-display text-foreground">Seen in the Wild</h1>
            <p className="text-xs text-muted-foreground">People you&apos;ve been near in real life</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : sightings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-none stroke-muted-foreground" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-sm font-semibold text-foreground">No sightings yet</p>
            <p className="text-xs text-muted-foreground">When you&apos;re near other CRUSH users in real life, they&apos;ll appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sightings.map((s) => <SightingCard key={s.id} sighting={s} />)}
          </div>
        )}

        {/* Premium upsell if any are blurred */}
        {sightings.some((s) => s.otherUser.blurred) && (
          <div className="mt-4 p-4 rounded-2xl bg-primary/8 border border-primary/20">
            <p className="text-sm font-semibold text-foreground mb-1">Unlock full reveals with Premium</p>
            <p className="text-xs text-muted-foreground mb-3">
              See the name and photo of everyone you&apos;ve crossed paths with.
            </p>
            <Link
              href="/upgrade"
              className="inline-flex items-center h-9 px-4 rounded-full bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
