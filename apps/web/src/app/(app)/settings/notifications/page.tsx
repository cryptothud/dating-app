'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { toast } from '@/lib/toast'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`appearance-none flex-shrink-0 w-11 h-6 rounded-full transition-colors outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${checked ? 'bg-purple-600' : 'bg-muted'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform m-0.5 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function Row({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-4 py-4 gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

const STORAGE_KEY = 'crush:notif:prefs'

interface NotifPrefs {
  messages: boolean
  matches: boolean
  nearby: boolean
  pushEnabled: boolean
}

const DEFAULTS: NotifPrefs = { messages: true, matches: true, nearby: false, pushEnabled: false }

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as NotifPrefs) : DEFAULTS
  } catch { return DEFAULTS }
}

function isIosSafariNotInstalled(): boolean {
  if (typeof navigator === 'undefined') return false
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return isIos && !standalone
}

export default function NotificationsPage(): React.JSX.Element {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS)
  const [pushStatus, setPushStatus] = useState<'idle' | 'requesting' | 'denied' | 'unsupported'>('idle')

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  function save(next: NotifPrefs): void {
    setPrefs(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function toggle(key: keyof NotifPrefs): void {
    save({ ...prefs, [key]: !prefs[key] })
  }

  async function enablePush(): Promise<void> {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported')
      toast.warning(isIosSafariNotInstalled() ? 'Push unsupported: iOS requires adding to Home Screen first' : 'Push unsupported in this browser')
      return
    }
    setPushStatus('requesting')
    try {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js')
      const ok = await subscribeToPush()
      if (!ok) {
        setPushStatus(Notification.permission === 'denied' ? 'denied' : 'unsupported')
        toast.error(`Push subscription failed (permission: ${Notification.permission})`)
        save({ ...prefs, pushEnabled: false })
        return
      }
      save({ ...prefs, pushEnabled: true })
      setPushStatus('idle')
      toast.success('Push notifications enabled')
    } catch (e) {
      setPushStatus('unsupported')
      toast.error(`Push subscription threw: ${e instanceof Error ? e.message : String(e)}`)
      save({ ...prefs, pushEnabled: false })
    }
  }

  async function disablePush(): Promise<void> {
    await unsubscribeFromPush().catch((e) => toast.error(`Unsubscribe failed: ${e instanceof Error ? e.message : String(e)}`))
    save({ ...prefs, pushEnabled: false })
  }

  function handlePushToggle(enabled: boolean): void {
    if (enabled) { void enablePush() } else { void disablePush() }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4L6 8l4 4" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold font-display text-foreground">Notifications</h1>
        </div>

        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Push notifications</h2>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable push notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pushStatus === 'requesting' ? 'Requesting permission…' :
                      pushStatus === 'denied' ? 'Permission denied — check browser settings' :
                      pushStatus === 'unsupported' ? (isIosSafariNotInstalled()
                        ? 'On iPhone, add CRUSH to your Home Screen first (Share → Add to Home Screen)'
                        : 'Push notifications aren’t supported in this browser') :
                      'Receive alerts even when the app is closed'}
                  </p>
                </div>
                {pushStatus === 'requesting' ? (
                  <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : (
                  <Toggle checked={prefs.pushEnabled} onChange={handlePushToggle} />
                )}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alert types</h2>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border">
              <Row
                label="New messages"
                description="When someone sends you a message"
                checked={prefs.messages}
                onChange={() => toggle('messages')}
              />
              <Row
                label="New matches"
                description="When you connect with someone nearby"
                checked={prefs.matches}
                onChange={() => toggle('matches')}
              />
              <Row
                label="People nearby"
                description="When someone appears near your location"
                checked={prefs.nearby}
                onChange={() => toggle('nearby')}
              />
            </div>
          </section>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Alert type preferences are saved on this device.
        </p>
      </div>
    </div>
  )
}
