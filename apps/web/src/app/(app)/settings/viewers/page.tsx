'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { profileApi } from '@/lib/profile'
import { useSubscription } from '@/hooks/use-subscription'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

interface Viewer {
  id: string
  displayName: string | null
  photoUrl: string | null
  viewedAt: string
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Avatar({ viewer }: { viewer: Viewer }) {
  if (viewer.photoUrl) {
    return (
      <Image
        src={viewer.photoUrl}
        alt={viewer.displayName ?? 'User'}
        width={48}
        height={48}
        className="w-12 h-12 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-primary">
        {(viewer.displayName ?? '?').slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

export default function ProfileViewersPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { isPremiumPlus } = useSubscription(isAuthenticated)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPremiumPlus) return
    profileApi.getViewers()
      .then(setViewers)
      .catch(() => setError('Failed to load viewers'))
      .finally(() => setLoading(false))
  }, [isPremiumPlus])

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Profile Viewers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">People who viewed your profile in the last 30 days</p>
          </div>
        </div>

        {/* Premium+ gate */}
        {!isPremiumPlus && !loading && (
          <div className="flex flex-col items-center text-center gap-4 py-10 px-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-amber-500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground">Premium+ Feature</p>
              <p className="text-sm text-muted-foreground mt-1">See who's been viewing your profile with a Premium+ subscription.</p>
            </div>
            <Link
              href="/upgrade"
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              Upgrade to Premium+
            </Link>
          </div>
        )}

        {/* Loading */}
        {isPremiumPlus && loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {isPremiumPlus && !loading && !error && viewers.length === 0 && (
          <div className="flex flex-col items-center text-center gap-3 py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-muted-foreground" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground">No viewers yet</p>
              <p className="text-sm text-muted-foreground mt-1">When someone views your profile, they'll appear here.</p>
            </div>
          </div>
        )}

        {/* Viewers list */}
        {viewers.length > 0 && (
          <div className="space-y-px">
            {viewers.map((v) => (
              <Link
                key={v.id}
                href={`/messages/${v.id}`}
                className="flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-muted/50 transition-colors"
              >
                <Avatar viewer={v} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {v.displayName ?? 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(v.viewedAt)}</p>
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-muted-foreground" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
