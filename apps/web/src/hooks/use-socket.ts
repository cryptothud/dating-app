'use client'

import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

// In production, NEXT_PUBLIC_SOCKET_URL points to the Railway API directly.
// Socket.io WebSockets can't be proxied through Next.js/Vercel rewrites, so we
// connect to Railway directly and authenticate via a short-lived token (not cookies).
// In dev, connect to localhost:4000 directly.
function getSocketOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL
  if (envUrl) return envUrl
  return 'http://localhost:4000'
}
const BASE_URL = getSocketOrigin()

let singleton: Socket | null = null

function getSocket(): Socket {
  if (!singleton) {
    singleton = io(`${BASE_URL}/chat`, {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })
  }
  return singleton
}

export function useSocket(): Socket {
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    const socket = socketRef.current
    if (socket.connected) return

    // Fetch a short-lived socket token (60s) from the API, set it in socket.auth,
    // then connect. The gateway reads this token instead of the httpOnly cookie,
    // which isn't sent to Railway since cookies are scoped to the Vercel domain.
    fetch('/api/auth/socket-token', { credentials: 'include' })
      .then((r) => r.ok ? (r.json() as Promise<{ token: string }>) : Promise.reject())
      .then(({ token }) => { socket.auth = { token } })
      .catch(() => null)
      .finally(() => {
        if (!socket.connected) socket.connect()
      })
  }, [])

  return socketRef.current
}
