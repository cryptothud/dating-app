'use client'

import { useEffect, useRef } from 'react'
import { subscribeToPush } from '@/lib/push'

export function usePushNotifications(enabled: boolean) {
  const subscribed = useRef(false)

  useEffect(() => {
    if (!enabled || subscribed.current) return
    if (typeof window === 'undefined') return

    const register = async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js')
      }
      await subscribeToPush()
      subscribed.current = true
    }

    void register()
  }, [enabled])
}
