'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import type { MapUser } from '@dating-app/types'
import { BlockReportSheet } from '@/components/ui/block-report-sheet'

function formatLastActive(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000
  if (mins < 1) return 'Active now'
  if (mins < 60) return `${Math.floor(mins)}m ago`
  const hrs = mins / 60
  if (hrs < 24) return `${Math.floor(hrs)}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props {
  user: MapUser
  isAuthenticated: boolean
  onClose: () => void
  onMessage: (userId: string) => void
}

export function MiniProfileCard({ user, isAuthenticated, onClose, onMessage }: Props): React.JSX.Element {
  const [showBlockReport, setShowBlockReport] = useState(false)
  const statusLabel = user.activelyLooking
    ? 'Looking now'
    : user.status === 'online'
      ? 'Active now'
      : formatLastActive(user.lastActiveAt)

  const statusColor = user.activelyLooking
    ? 'text-[hsl(var(--dot-active))]'
    : user.status === 'online'
      ? 'text-emerald-400'
      : 'text-muted-foreground'

  return (
    <>
      {showBlockReport && (
        <BlockReportSheet
          userId={user.id}
          displayName={user.displayName ?? 'this user'}
          onClose={() => setShowBlockReport(false)}
          onBlocked={onClose}
        />
      )}
      <div className="absolute inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="absolute bottom-4 left-4 right-4 z-50 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 p-4">
          <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
            {user.primaryPhotoUrl ? (
              <Image src={user.primaryPhotoUrl} alt="" fill className="object-cover" sizes="80px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
            )}
            {user.isVerified && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-white">
                  <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold truncate">
                {user.displayName ?? 'Anonymous'}
                {user.age ? `, ${user.age}` : ''}
              </p>
            </div>
            <p className={`text-xs mt-0.5 ${statusColor}`}>{statusLabel}</p>
          </div>

          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <button
                onClick={() => setShowBlockReport(true)}
                className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Block or report"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          {isAuthenticated ? (
            <button
              onClick={() => onMessage(user.id)}
              className="btn-primary w-full"
            >
              Message
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/"
                className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold border border-border bg-muted/60 text-foreground hover:bg-muted transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 transition-opacity"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
