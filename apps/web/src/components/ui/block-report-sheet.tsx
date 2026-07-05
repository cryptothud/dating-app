'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { users, type ReportReason } from '@/lib/users'
import { adminApi } from '@/lib/admin'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/lib/toast'

interface Props {
  userId: string
  displayName: string
  onClose: () => void
  onBlocked: () => void
}

interface TargetUserStatus {
  role: string
  suspended: boolean
  banned: boolean
  timeoutUntil: string | null
}

const REPORT_REASONS: { label: string; value: ReportReason }[] = [
  { label: 'Spam or scam', value: 'SPAM' },
  { label: 'Harassment', value: 'HARASSMENT' },
  { label: 'Underage user', value: 'UNDERAGE' },
  { label: 'Fake profile', value: 'FAKE_PROFILE' },
  { label: 'Threats / violence', value: 'VIOLENCE' },
  { label: 'Other', value: 'OTHER' },
]

type Step = 'menu' | 'report-reason' | 'report-details' | 'done' | 'mod-reason'
type ModAction = 'warn' | 'suspend' | 'ban'

export function BlockReportSheet({ userId, displayName, onClose, onBlocked }: Props) {
  const { user } = useAuth()
  const currentRole = user?.role ?? 'user'
  const isMod = currentRole === 'moderator' || currentRole === 'admin'
  const isAdmin = currentRole === 'admin'

  const [step, setStep] = useState<Step>('menu')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [targetStatus, setTargetStatus] = useState<TargetUserStatus | null>(null)
  const [modReason, setModReason] = useState('')
  const [pendingAction, setPendingAction] = useState<ModAction | null>(null)

  useEffect(() => {
    if (!isMod) return
    adminApi.getUser(userId)
      .then((u) => setTargetStatus({
        role: u.role,
        suspended: u.suspended,
        banned: u.banned,
        timeoutUntil: u.timeoutUntil,
      }))
      .catch(() => null)
  }, [isMod, userId])

  const canActOnTarget = targetStatus !== null && (
    isAdmin
      ? targetStatus.role !== 'admin'
      : targetStatus.role === 'user'
  )

  const isTimedOut = !!targetStatus?.timeoutUntil
    && new Date(targetStatus.timeoutUntil) > new Date()

  async function block() {
    setLoading(true)
    try {
      await users.block(userId)
      onBlocked()
      onClose()
    } catch { setError('Could not block — try again') }
    finally { setLoading(false) }
  }

  async function submitReport() {
    if (!reason) return
    setLoading(true); setError('')
    try {
      await users.report(userId, reason, details || 'No additional details')
      setStep('done')
    } catch { setError('Could not submit report — try again') }
    finally { setLoading(false) }
  }

  function openModAction(action: ModAction) {
    setPendingAction(action)
    setModReason('')
    setStep('mod-reason')
  }

  async function submitModAction() {
    if (!pendingAction) return
    if (!modReason.trim()) { setError('Reason is required'); return }
    setLoading(true); setError('')
    try {
      if (pendingAction === 'warn') await adminApi.warn(userId, modReason)
      else if (pendingAction === 'suspend') await adminApi.suspend(userId, modReason)
      else if (pendingAction === 'ban') await adminApi.ban(userId, modReason)
      toast.success(
        pendingAction === 'warn' ? 'User warned.' :
        pendingAction === 'suspend' ? 'User suspended.' : 'User banned.',
      )
      if (pendingAction === 'ban') {
        setTargetStatus((s) => s ? { ...s, banned: true } : s)
      } else if (pendingAction === 'suspend') {
        setTargetStatus((s) => s ? { ...s, suspended: true } : s)
      }
      setStep('menu')
      setPendingAction(null)
      setModReason('')
    } catch { setError('Action failed — try again') }
    finally { setLoading(false) }
  }

  async function handleUnsuspend() {
    setLoading(true)
    try {
      await adminApi.unsuspend(userId)
      setTargetStatus((s) => s ? { ...s, suspended: false } : s)
      toast.success('User unsuspended.')
    } catch { toast.error('Failed to unsuspend') }
    finally { setLoading(false) }
  }

  async function handleUnban() {
    setLoading(true)
    try {
      await adminApi.unban(userId)
      setTargetStatus((s) => s ? { ...s, banned: false } : s)
      toast.success('User unbanned.')
    } catch { toast.error('Failed to unban') }
    finally { setLoading(false) }
  }

  async function handleClearTimeout() {
    setLoading(true)
    try {
      await adminApi.clearTimeout(userId)
      setTargetStatus((s) => s ? { ...s, timeoutUntil: null } : s)
      toast.success('Timeout removed.')
    } catch { toast.error('Failed to remove timeout') }
    finally { setLoading(false) }
  }

  async function handleForceLogout() {
    setLoading(true)
    try {
      await adminApi.forceLogout(userId)
      toast.success('User force-logged out.')
    } catch { toast.error('Failed to force logout') }
    finally { setLoading(false) }
  }

  const modActionLabel = pendingAction === 'warn' ? 'Warn' : pendingAction === 'suspend' ? 'Suspend' : 'Ban'

  return (
    <>
      <div className="absolute inset-0 z-[85] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="absolute bottom-0 left-0 right-0 z-[90] bg-background border-t border-border rounded-t-2xl shadow-2xl px-4 pb-8 pt-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle + close */}
          <div className="relative flex justify-center mb-5">
            <div className="w-10 h-1 rounded-full bg-border" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>

          {step === 'menu' && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground mb-4">{displayName}</p>

              <button
                onClick={() => setStep('report-reason')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <span className="text-amber-500"><FlagIcon /></span>
                <span className="text-sm font-medium text-foreground">Report</span>
              </button>

              <button
                onClick={() => void block()}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-red-500"><BlockIcon /></span>
                <span className="text-sm font-medium text-red-500">Block</span>
              </button>

              {/* Mod / Admin actions */}
              {isMod && canActOnTarget && (
                <>
                  <div className="border-t border-border/50 my-3" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    {isAdmin ? 'Admin' : 'Mod'} Actions
                  </p>

                  <button
                    onClick={() => openModAction('warn')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-500/10 transition-colors text-left"
                  >
                    <span className="text-amber-500"><WarnIcon /></span>
                    <span className="text-sm font-medium text-foreground">Warn</span>
                  </button>

                  {targetStatus?.suspended ? (
                    <button
                      onClick={() => void handleUnsuspend()}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sky-500/10 transition-colors text-left disabled:opacity-50"
                    >
                      <span className="text-sky-500"><UnsuspendIcon /></span>
                      <span className="text-sm font-medium text-foreground">Unsuspend</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openModAction('suspend')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-500/10 transition-colors text-left"
                    >
                      <span className="text-orange-500"><SuspendIcon /></span>
                      <span className="text-sm font-medium text-foreground">Suspend</span>
                    </button>
                  )}

                  {targetStatus?.banned ? (
                    <button
                      onClick={() => void handleUnban()}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sky-500/10 transition-colors text-left disabled:opacity-50"
                    >
                      <span className="text-sky-500"><UnbanIcon /></span>
                      <span className="text-sm font-medium text-foreground">Unban</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openModAction('ban')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
                    >
                      <span className="text-red-500"><BanIcon /></span>
                      <span className="text-sm font-medium text-red-500">Ban</span>
                    </button>
                  )}

                  {isTimedOut && (
                    <button
                      onClick={() => void handleClearTimeout()}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sky-500/10 transition-colors text-left disabled:opacity-50"
                    >
                      <span className="text-sky-500"><UntimeoutIcon /></span>
                      <span className="text-sm font-medium text-foreground">Remove Timeout</span>
                    </button>
                  )}

                  <button
                    onClick={() => void handleForceLogout()}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-50"
                  >
                    <span className="text-muted-foreground"><ForceLogoutIcon /></span>
                    <span className="text-sm font-medium text-foreground">Force Logout</span>
                  </button>
                </>
              )}

              {error && <p className="text-xs text-red-500 px-4">{error}</p>}
            </div>
          )}

          {step === 'mod-reason' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">
                {modActionLabel} <span className="font-normal text-muted-foreground">— {displayName}</span>
              </h2>
              <textarea
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder="Reason…"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('menu'); setError('') }}
                  className="flex-1 rounded-xl border border-border text-sm font-medium py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void submitModAction()}
                  disabled={loading || !modReason.trim()}
                  className={[
                    'flex-1 rounded-xl font-semibold py-3 text-sm transition-opacity',
                    pendingAction === 'ban'
                      ? 'bg-red-500 text-white hover:opacity-90 disabled:opacity-50'
                      : 'bg-primary text-white hover:opacity-90 disabled:opacity-50',
                  ].join(' ')}
                >
                  {loading ? 'Submitting…' : modActionLabel}
                </button>
              </div>
            </div>
          )}

          {step === 'report-reason' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground mb-1">What&apos;s the issue?</h2>
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setReason(r.value); setStep('report-details') }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-sm text-foreground">{r.label}</span>
                  <ChevronRight />
                </button>
              ))}
            </div>
          )}

          {step === 'report-details' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Additional details <span className="text-muted-foreground font-normal">(optional)</span></h2>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us more about what happened…"
                rows={4}
                maxLength={1000}
                className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={() => void submitReport()}
                disabled={loading}
                className="w-full rounded-xl bg-primary text-white font-semibold py-3 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4 space-y-3">
              <p className="text-2xl">✓</p>
              <p className="text-sm font-semibold text-foreground">Report submitted</p>
              <p className="text-xs text-muted-foreground">Thanks for keeping CRUSH safe. Our team will review this.</p>
              <button onClick={onClose} className="text-sm text-primary hover:underline">Close</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
    </svg>
  )
}
function BlockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}
function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
function SuspendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="4" height="18" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}
function UnsuspendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
function BanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" />
    </svg>
  )
}
function UnbanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
    </svg>
  )
}
function UntimeoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /><path d="M5 3l-2 2M19 3l2 2" />
    </svg>
  )
}
function ForceLogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current text-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
