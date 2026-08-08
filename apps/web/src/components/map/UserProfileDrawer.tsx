'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { profileApi, promptLabel } from '@/lib/profile'
import { BlockReportSheet } from '@/components/ui/block-report-sheet'
import type { UserProfile } from '@dating-app/types'

function formatLastActive(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000
  if (mins < 1) return 'Active now'
  if (mins < 60) return `${Math.floor(mins)}m ago`
  const hrs = mins / 60
  if (hrs < 24) return `${Math.floor(hrs)}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props {
  userId: string
  displayName: string | null
  lastActiveAt?: string
  distanceMiles?: number
  activelyLooking?: boolean
  onClose: () => void
  onMessage: (userId: string) => void
}

export function UserProfileDrawer({
  userId,
  displayName,
  lastActiveAt,
  distanceMiles,
  activelyLooking,
  onClose,
  onMessage,
}: Props): React.JSX.Element {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showBlockReport, setShowBlockReport] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStartX = useRef<number>(0)

  useEffect(() => {
    void profileApi
      .getUser(userId)
      .then(setProfile)
      .catch(() => null)
  }, [userId])

  const photos = profile?.photos ?? []

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null))
      if (e.key === 'ArrowRight')
        setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, photos.length])

  const isActiveNow = lastActiveAt
    ? Date.now() - new Date(lastActiveAt).getTime() < 5 * 60 * 1000
    : false

  return (
    <>
      {/* z-[70] backdrop sits above the chat panel (z-[60]) */}
      <div className="absolute inset-0 z-[70]" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="bg-background border-border absolute bottom-0 left-0 right-0 z-[80] flex flex-col overflow-hidden rounded-t-3xl border-t shadow-2xl"
        style={{ maxHeight: '82svh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <div className="bg-border h-1 w-10 rounded-full" />
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-scroll"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Header row: name + actions */}
          <div className="flex items-start justify-between px-4 pb-1 pt-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-foreground text-xl font-bold leading-tight">
                  {profile?.displayName ?? displayName ?? 'Anonymous'}
                  {profile?.age ? `, ${profile.age}` : ''}
                </h2>
                {profile?.verified && (
                  <span className="bg-primary/10 border-primary/20 text-primary inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold">
                    <svg viewBox="0 0 16 16" className="fill-primary h-3 w-3">
                      <path d="M8 1l1.48 3.01 3.32.48-2.4 2.34.57 3.3L8 8.57 5.03 10.13l.57-3.3-2.4-2.34 3.32-.48z" />
                    </svg>
                    Verified
                  </span>
                )}
                {activelyLooking && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-500">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                    Actively looking
                  </span>
                )}
              </div>
              {/* Last active + distance */}
              {(lastActiveAt || distanceMiles !== undefined) && (
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  {lastActiveAt && (
                    <div className="flex items-center gap-1">
                      {isActiveNow && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                      )}
                      <p
                        className={`text-xs ${isActiveNow ? 'text-emerald-400' : 'text-muted-foreground'}`}
                      >
                        {isActiveNow ? 'Active now' : `Active ${formatLastActive(lastActiveAt)}`}
                      </p>
                    </div>
                  )}
                  {distanceMiles !== undefined && (
                    <>
                      {lastActiveAt && <span className="text-muted-foreground/40 text-xs">·</span>}
                      <p className="text-muted-foreground text-xs">
                        {distanceMiles < 0.5
                          ? '< 1 mi away'
                          : `~${Math.round(distanceMiles)} mi away`}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setShowBlockReport(true)}
                className="bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                aria-label="Block or report"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              >
                <svg
                  viewBox="0 0 14 14"
                  className="h-3.5 w-3.5 fill-none stroke-current"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Photos — horizontal scrollable row, click any to enlarge */}
          <div className="px-4 pt-3">
            {photos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxIndex(i)}
                    className="bg-muted group relative h-[120px] w-[120px] shrink-0 cursor-zoom-in overflow-hidden rounded-xl"
                  >
                    <img
                      src={photo.url}
                      alt=""
                      className={[
                        'h-full w-full object-cover transition-all duration-200 group-hover:scale-105 group-hover:opacity-90',
                        photo.blurEnabled ? 'blur-sm' : '',
                      ].join(' ')}
                    />
                    {photo.blurEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                          18+
                        </span>
                      </div>
                    )}
                    {photo.isPrimary && photos.length > 1 && (
                      <div className="bg-primary pointer-events-none absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full">
                        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 fill-white">
                          <path d="M8 1l1.9 3.85L14 5.73l-3 2.92.71 4.14L8 10.65l-3.71 2.14.71-4.14L2 5.73l4.1-.88z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 fill-none stroke-white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : !profile ? (
              <div className="flex animate-pulse gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-muted h-[120px] w-[120px] shrink-0 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center">
                <div className="bg-primary/15 flex h-16 w-16 items-center justify-center rounded-full">
                  <svg viewBox="0 0 24 24" className="text-primary/40 h-8 w-8 fill-current">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 p-4">
            {/* Bio */}
            {profile?.bio && (
              <p className="text-foreground/80 text-sm leading-relaxed">{profile.bio}</p>
            )}

            {/* Looking for */}
            {(profile?.lookingFor?.length ?? 0) > 0 && (
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-widest">
                  I&apos;m looking for
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile!.lookingFor.map((tag) => (
                    <span
                      key={tag}
                      className="bg-muted border-border text-foreground/80 rounded-full border px-2.5 py-1 text-xs font-medium capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Body type + sexuality */}
            {(profile?.bodyType || profile?.sexuality) && (
              <div className="flex flex-wrap gap-2">
                {profile?.bodyType && (
                  <div>
                    <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-widest">
                      My body type
                    </p>
                    <span className="bg-primary/10 border-primary/20 text-primary rounded-full border px-2.5 py-1 text-xs font-medium capitalize">
                      {profile.bodyType}
                    </span>
                  </div>
                )}
                {profile?.sexuality && (
                  <div>
                    <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-widest">
                      Sexuality
                    </p>
                    <span className="bg-muted border-border text-foreground/80 rounded-full border px-2.5 py-1 text-xs font-medium capitalize">
                      {profile.sexuality}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Interests */}
            {(profile?.interests?.length ?? 0) > 0 && (
              <div>
                <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-widest">
                  My interests
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile!.interests.map((interest) => (
                    <span
                      key={interest}
                      className="bg-muted/60 border-border/60 text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prompts */}
            {(profile?.prompts?.length ?? 0) > 0 && (
              <div className="space-y-3">
                {profile!.prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="bg-muted/60 border-border/50 rounded-2xl border p-3"
                  >
                    <p className="text-muted-foreground mb-1 text-[11px] font-medium uppercase tracking-wide">
                      {promptLabel(prompt.promptKey)}
                    </p>
                    <p className="text-foreground text-sm">{prompt.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Loading skeleton */}
            {!profile && (
              <div className="animate-pulse space-y-3">
                <div className="bg-muted h-4 w-3/4 rounded" />
                <div className="bg-muted h-4 w-1/2 rounded" />
                <div className="bg-muted h-16 rounded-2xl" />
              </div>
            )}

            {/* Message CTA */}
            <button onClick={() => onMessage(userId)} className="btn-primary mt-2 w-full">
              Message
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lightbox — full-screen overlay */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxIndex(null)}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? 0
            }}
            onTouchEnd={(e) => {
              const diff = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0)
              if (Math.abs(diff) > 48) {
                if (diff > 0)
                  setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null))
                else setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null))
              }
            }}
          >
            {/* Close */}
            <button
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              onClick={() => setLightboxIndex(null)}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Photo */}
            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15 }}
              src={photos[lightboxIndex]?.url ?? ''}
              alt=""
              className="max-h-full max-w-full select-none rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Prev arrow */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null))
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Next arrow */}
            {lightboxIndex < photos.length - 1 && (
              <button
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null))
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            )}

            {/* Dots */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxIndex(i)
                    }}
                    className={[
                      'h-1.5 rounded-full transition-all duration-200',
                      i === lightboxIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40',
                    ].join(' ')}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Block/report sheet — above everything else */}
      {showBlockReport && (
        <BlockReportSheet
          userId={userId}
          displayName={profile?.displayName ?? displayName ?? 'this user'}
          onClose={() => setShowBlockReport(false)}
          onBlocked={onClose}
        />
      )}
    </>
  )
}
