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

export function UserProfileDrawer({ userId, displayName, lastActiveAt, distanceMiles, activelyLooking, onClose, onMessage }: Props): React.JSX.Element {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showBlockReport, setShowBlockReport] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStartX = useRef<number>(0)

  useEffect(() => {
    void profileApi.getUser(userId).then(setProfile).catch(() => null)
  }, [userId])

  const photos = profile?.photos ?? []

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null))
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, photos.length])

  const isActiveNow = lastActiveAt
    ? (Date.now() - new Date(lastActiveAt).getTime()) < 5 * 60 * 1000
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
        className="absolute bottom-0 left-0 right-0 z-[80] bg-background border-t border-border rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '82svh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-scroll" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {/* Header row: name + actions */}
          <div className="flex items-start justify-between px-4 pt-2 pb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-display text-foreground leading-tight">
                  {profile?.displayName ?? displayName ?? 'Anonymous'}
                  {profile?.age ? `, ${profile.age}` : ''}
                </h2>
                {profile?.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shrink-0">
                    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-primary">
                      <path d="M8 1l1.48 3.01 3.32.48-2.4 2.34.57 3.3L8 8.57 5.03 10.13l.57-3.3-2.4-2.34 3.32-.48z" />
                    </svg>
                    Verified
                  </span>
                )}
                {activelyLooking && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] font-semibold text-orange-500 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Actively looking
                  </span>
                )}
              </div>
              {/* Last active + distance */}
              {(lastActiveAt || distanceMiles !== undefined) && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {lastActiveAt && (
                    <div className="flex items-center gap-1">
                      {isActiveNow && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                      )}
                      <p className={`text-xs ${isActiveNow ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {isActiveNow ? 'Active now' : `Active ${formatLastActive(lastActiveAt)}`}
                      </p>
                    </div>
                  )}
                  {distanceMiles !== undefined && (
                    <>
                      {lastActiveAt && <span className="text-xs text-muted-foreground/40">·</span>}
                      <p className="text-xs text-muted-foreground">
                        {distanceMiles < 0.5 ? '< 1 mi away' : `~${Math.round(distanceMiles)} mi away`}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <button
                onClick={() => setShowBlockReport(true)}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Block or report"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
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
                    className="relative w-[120px] h-[120px] shrink-0 bg-muted rounded-xl overflow-hidden group cursor-zoom-in"
                  >
                    <img
                      src={photo.url}
                      alt=""
                      className={[
                        'w-full h-full object-cover transition-all duration-200 group-hover:scale-105 group-hover:opacity-90',
                        photo.blurEnabled ? 'blur-sm' : '',
                      ].join(' ')}
                    />
                    {photo.blurEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-[10px] font-semibold bg-black/60 px-2 py-0.5 rounded-full">18+</span>
                      </div>
                    )}
                    {photo.isPrimary && photos.length > 1 && (
                      <div className="absolute top-1 left-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center pointer-events-none">
                        <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-white">
                          <path d="M8 1l1.9 3.85L14 5.73l-3 2.92.71 4.14L8 10.65l-3.71 2.14.71-4.14L2 5.73l4.1-.88z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth="2" strokeLinecap="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : !profile ? (
              <div className="flex gap-2 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-[120px] h-[120px] shrink-0 rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-primary/40">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
            )}

            {/* Looking for */}
            {(profile?.lookingFor?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">I&apos;m looking for</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile!.lookingFor.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-medium text-foreground/80 capitalize">
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
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">My body type</p>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary capitalize">
                      {profile.bodyType}
                    </span>
                  </div>
                )}
                {profile?.sexuality && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Sexuality</p>
                    <span className="px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-medium text-foreground/80 capitalize">
                      {profile.sexuality}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Interests */}
            {(profile?.interests?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">My interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile!.interests.map((interest) => (
                    <span key={interest} className="px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-medium text-muted-foreground">
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
                  <div key={prompt.id} className="rounded-2xl bg-muted/60 border border-border/50 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {promptLabel(prompt.promptKey)}
                    </p>
                    <p className="text-sm text-foreground">{prompt.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Loading skeleton */}
            {!profile && (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-16 bg-muted rounded-2xl" />
              </div>
            )}

            {/* Message CTA */}
            <button
              onClick={() => onMessage(userId)}
              className="btn-primary w-full mt-2"
            >
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
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
            onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? 0 }}
            onTouchEnd={(e) => {
              const diff = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0)
              if (Math.abs(diff) > 48) {
                if (diff > 0) setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null))
                else setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null))
              }
            }}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              onClick={() => setLightboxIndex(null)}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
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
              className="max-w-full max-h-full object-contain rounded-xl select-none"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Prev arrow */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null)) }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Next arrow */}
            {lightboxIndex < photos.length - 1 && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null)) }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round">
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
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i) }}
                    className={[
                      'h-1.5 rounded-full transition-all duration-200',
                      i === lightboxIndex ? 'bg-white w-5' : 'bg-white/40 w-1.5',
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
