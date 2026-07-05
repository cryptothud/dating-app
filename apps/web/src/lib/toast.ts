export type ToastVariant = 'error' | 'success' | 'info' | 'warning'

export interface ToastMeta {
  type: 'dm'
  senderName: string
  avatarUrl?: string | null
  preview?: string
}

export interface ToastOptions {
  duration?: number
  /** Show in production too. Without this, toasts only render when NODE_ENV !== 'production'. */
  force?: boolean
  onClick?: () => void
  meta?: ToastMeta
}

export interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
  duration: number
  onClick?: () => void
  meta?: ToastMeta
}

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
let nextId = 0
const listeners = new Set<Listener>()

function emit(): void {
  listeners.forEach((l) => l(toasts))
}

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production'
}

function push(message: string, variant: ToastVariant, opts: ToastOptions = {}): void {
  if (typeof window === 'undefined') return
  if (!isDev() && !opts.force) return
  const item: ToastItem = {
    id: nextId++,
    message,
    variant,
    duration: opts.duration ?? 5000,
    onClick: opts.onClick,
    meta: opts.meta,
  }
  toasts = [...toasts, item]
  emit()
}

function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  listener(toasts)
  return () => listeners.delete(listener)
}

export const toast = {
  error: (message: string, opts?: ToastOptions) => push(message, 'error', opts),
  success: (message: string, opts?: ToastOptions) => push(message, 'success', opts),
  info: (message: string, opts?: ToastOptions) => push(message, 'info', opts),
  warning: (message: string, opts?: ToastOptions) => push(message, 'warning', opts),
  dismiss,
}
