'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const API_JS = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

// If the tag neither loads nor errors within this window, treat it as blocked. Some
// content blockers stall the request instead of failing it, which would otherwise
// leave the gate waiting forever with no feedback.
const SCRIPT_TIMEOUT_MS = 15_000

// One shared load promise for the whole page: concurrent mounts await the same script
// instead of each injecting their own tag or polling for window.turnstile.
let scriptPromise: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const callbackName = `_onTurnstileLoad_${Math.random().toString(36).slice(2)}`
    const globals = window as unknown as Record<string, unknown>

    // Allow a later mount to retry after any failure.
    const fail = (reason: string): void => {
      clearTimeout(timer)
      delete globals[callbackName]
      scriptPromise = null
      reject(new Error(reason))
    }
    const timer = setTimeout(() => fail('turnstile_script_timeout'), SCRIPT_TIMEOUT_MS)

    globals[callbackName] = (): void => {
      clearTimeout(timer)
      delete globals[callbackName]
      resolve()
    }

    const script = document.createElement('script')
    script.src = `${API_JS}?onload=${callbackName}&render=explicit`
    script.async = true
    script.onerror = (): void => fail('turnstile_script_failed')
    document.head.appendChild(script)
  })

  return scriptPromise
}

interface Props {
  sitekey: string
  /** Receives Cloudflare's error code so the caller can tell a misconfiguration
   *  (110xxx, not retryable) from a failed challenge (300xxx/600xxx, retryable). */
  onError: (code: string) => void
  onToken: (token: string) => void
  onExpire: () => void
}

/**
 * Renders the Turnstile challenge into its own container.
 *
 * The widget is created in this component's own mount effect, so the container node is
 * guaranteed to exist by the time `turnstile.render` is called. Rendering from a parent
 * effect keyed on a step/tab value is what broke before: inside `AnimatePresence
 * mode="wait"` the parent's effect fires while the outgoing panel is still animating, so
 * the container had not been mounted yet and the render was silently skipped.
 *
 * To reset the challenge, change the `key` prop from the parent — remounting gives a
 * fresh widget and a fresh token.
 */
export function TurnstileWidget({ sitekey, onToken, onError, onExpire }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Held in a ref so changing callback identities never tears down a live widget.
  const handlers = useRef({ onToken, onError, onExpire })
  handlers.current = { onToken, onError, onExpire }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    // Two-argument then, deliberately: a trailing .catch() would also swallow anything
    // turnstile.render() throws and report it as a script load failure, which is how a
    // failing render came to be misreported as script-load-failed.
    loadTurnstile().then(
      () => {
        if (cancelled || !window.turnstile) return
        let widgetId: string | undefined
        try {
          widgetId = window.turnstile.render(container, {
            sitekey,
            theme: 'auto',
            callback: (token: string) => {
              if (!cancelled) handlers.current.onToken(token)
            },
            'error-callback': (code?: string | number) => {
              const errorCode = code === undefined || code === '' ? 'unknown' : String(code)
              if (!cancelled) handlers.current.onError(errorCode)
            },
            'expired-callback': () => {
              if (!cancelled) handlers.current.onExpire()
            },
          })
        } catch (err: unknown) {
          const detail = err instanceof Error ? err.message : String(err)
          if (!cancelled) handlers.current.onError(`render-threw: ${detail.slice(0, 120)}`)
          return
        }
        // Turnstile returns undefined instead of throwing for some rejections, which
        // would otherwise leave the gate waiting on a widget that was never created.
        if (widgetId === undefined) {
          if (!cancelled) handlers.current.onError('render-returned-nothing')
          return
        }
        widgetIdRef.current = widgetId
      },
      (err: unknown) => {
        const timedOut = err instanceof Error && err.message === 'turnstile_script_timeout'
        if (!cancelled) {
          handlers.current.onError(timedOut ? 'script-load-timeout' : 'script-load-failed')
        }
      },
    )

    return () => {
      cancelled = true
      const widgetId = widgetIdRef.current
      widgetIdRef.current = null
      if (widgetId !== null && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          // The widget may already be torn down by the time cleanup runs.
        }
      }
    }
  }, [sitekey])

  return <div ref={containerRef} />
}
